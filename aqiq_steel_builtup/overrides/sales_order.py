import json
import frappe
from frappe.utils import flt
from erpnext.selling.doctype.sales_order.sales_order import SalesOrder
from erpnext.stock.get_item_details import get_price_list_rate_for
from erpnext.manufacturing.doctype.bom.bom import get_valuation_rate
from erpnext import get_default_company

class CustomSalesOrder(SalesOrder):
    def validate(self):
        super(CustomSalesOrder, self).validate()
        # self.set_components()
        self.set_totals()

    @frappe.whitelist()
    def set_totals(self):
        for item in self.items:
            if item.custom_is_a_cmi:
                item.rate = 0
                item.base_rate = 0
                for comp in self.components:
                    if comp.parent_name == item.name_id:
                        if not comp.cost: comp.cost = 0

                        if not comp.rate: comp.rate = 0

                        comp.base_rate = comp.rate * self.conversion_rate
                        comp.amount = comp.rate * comp.qty
                        comp.base_amount = comp.amount * self.conversion_rate

                        comp.base_cost = comp.cost * self.conversion_rate
                        comp.cost_amount = comp.cost * comp.qty
                        comp.base_cost_amount = comp.cost_amount * self.conversion_rate


                        item.rate += comp.amount if comp.get("amount") else 0

                        item.base_rate += comp.base_amount if comp.get("base_amount") else 0
                
            item.custom_default_rate = item.rate
            item.custom_base_default_rate = item.base_rate
            
            if item.custom_item_discount:
                item.rate = item.rate - item.custom_item_discount
                item.base_rate = item.rate * self.conversion_rate
            
            if item.custom_rate_extra_charge:
                item.rate = item.rate - item.custom_rate_extra_charge
                item.base_rate = item.rate * self.conversion_rate

            if not item.qty: item.qty = 1

            item.amount = item.rate * item.qty
            item.base_amount = item.base_rate * item.qty

    def set_components(self):
        # if not self.to_set_components: return
        self.components = []
        for item in self.items:
            doc = frappe.get_doc("Item", item.item_code)
            if not doc.components: continue
            
            item.rate = 0
            for comp in doc.components:

                price_list_rate = get_price_list_rate_for({
                    "price_list": self.selling_price_list,
                    "uom": frappe.db.get_value("Item", comp.item_code, "stock_uom"),
                    "transaction_date": self.transaction_date,
                    "customer": self.customer
                }, comp.item_code) or 0

                comp_item = frappe._dict({
                    "item_code": comp.item_code,
                    "item_name": comp.item_name,
                    "qty": comp.qty if comp.qty > 0 else 1,
                    "parent_item": item.item_code,
                    "parent_name": item.name,
                    "base_rate": price_list_rate,
                    "rate": price_list_rate / self.conversion_rate,
                })
                comp_item.base_amount = price_list_rate * comp_item.qty
                comp_item.amount = comp_item.base_amount / self.conversion_rate

                self.append("components", comp_item)

                item.rate += comp_item.amount
                item.base_rate += comp_item.base_amount

            item.amount = item.rate * item.qty
            item.base_amount = item.base_rate * item.qty


@frappe.whitelist()
def update_components(updates_data, parent_index, sales_order):
    "Update The Components of an Item in a Sales Order"

    sales_order_doc = frappe.get_doc("Sales Order", sales_order)
    components = []
    updates_data = json.loads(updates_data)

    for item in sales_order_doc.items:
        #If the item index is the updated one then set the updated components
        if str(item.idx) == str(parent_index):
            item.rate = 0
            for comp in updates_data["components"]:

                comp_item = frappe._dict({
                    "item_code": comp["item_code"],
                    "item_name": comp["item_name"],
                    "qty": comp["qty"] if comp["qty"] > 0 else 1,
                    "parent_item": item.item_code,
                    "parent_name": item.name_id,
                    "rate": comp["rate"],
                    "amount": comp["amount"],
                    "cost": comp["cost"],
                    "cost_amount": comp["cost_amount"],
                    "surface_area": comp["surface_area"],
                    "surface_area_amount": comp["surface_area_amount"]

                })
                components.append(comp_item)

                item.rate += comp_item.amount

        #Else set the latest updated components details of the item 
        else:
            for comp_item in sales_order_doc.components:
                if item.name_id == comp_item.parent_name:
                    components.append(comp_item)

                item.rate += comp_item.amount

        item.amount = item.rate * item.qty

    return components

@frappe.whitelist()
def get_components(item, selling_price_list, transaction_date = None, customer = None, company = None):
    "Get Components of an Item"
    "selling_price_list, transaction_date, customer are to get the price_list_rate"
    "company is to get the valuation_rate of the item"

    doc = frappe.get_doc("Item", item)
    if not doc.components: return
    
    if not company:
        company = get_default_company()


    comps = []
    for comp in doc.components:

        price_list_rate = get_price_list_rate_for({
            "price_list": selling_price_list,
            "uom": frappe.db.get_value("Item", comp.item_code, "stock_uom"),
            "transaction_date": transaction_date,
            "customer": customer
        }, comp.item_code) or 0

        valuation_rate = get_valuation_rate({
            "item_code": comp.item_code,
            "company": company,
        })

        comp_item = frappe._dict({
            "item_code": comp.item_code,
            "item_name": comp.item_name,
            "qty": comp.qty if comp.qty > 0 else 1,
            "base_rate": price_list_rate or 0,
            "surface_area": frappe.db.get_value("Item", comp.item_code, "surface_area") or 0,
            "base_cost": valuation_rate,
            "base_cost_amount" : valuation_rate * comp.qty if comp.qty > 0 else valuation_rate,
            "base_amount": price_list_rate * comp.qty if comp.qty > 0 else price_list_rate
        })
        comp_item.surface_area_amount = comp_item.surface_area * comp_item.qty
    
        comps.append(comp_item)

    return comps

@frappe.whitelist()
def get_item_details(item_code, price_list, transaction_date = None, customer = None, company = None):
    results = {}

    results["item_name"] = frappe.db.get_value("Item", item_code, "item_name")

    if not company:
        company = get_default_company()

    results["rate"] = get_price_list_rate_for({
        "price_list": price_list,
        "uom": frappe.db.get_value("Item", item_code, "stock_uom"),
        "transaction_date": transaction_date,
        "customer": customer
    }, item_code) or 0

    results["cost"] = get_valuation_rate({
        "item_code": item_code,
        "company": company,
    })

    return results