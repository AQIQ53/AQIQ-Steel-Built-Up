cur_frm.set_query("sales_person", "sales_team", function(frm, cdt, cdn) {
    var d = locals[cdt][cdn];
	return {
	    filters:{"is_group": 0, "enabled": 1}
	}
});

frappe.ui.form.on("Sales Order", {
    refresh: function(frm){
        frm.trigger("item_code_listener")
    },
    calculate_total_surface_amount: function(dialog){
        let total = 0;
        for (const row of dialog.fields_dict["components"].df.data){
            total += row["surface_area_amount"];
        }
        dialog.fields_dict["total_surface_amount"].value = total;
        dialog.refresh();
    },
    item_code_listener: function(frm){
    // Set a Ctrl + i listner inside the item  to open components dialog to update the compnents of the item
        cur_frm.$wrapper.find("[data-fieldname=items]  .col[data-fieldname=item_code]").click(function(){
        
            const item_code = $(this).find("input").val();
            const index = $(this).siblings(".row-index").find("span").text();
            let me = $(this);
            $(this).off('keydown');
            $(this).on('keydown', function (e) {
                if (e.ctrlKey && e.key === 'i') {
                    if (frm.is_new())
                        frappe.throw("Save the document before updating the components")
                    frm.events.open_components_dialog(frm, item_code, index)
                    me.removeAttr("click");
                    $(this).off('keydown');
                }
            })
            });
    },
    open_components_dialog: function(frm, item_code, index){
        var d = new frappe.ui.Dialog({
			title: __('Set Components Values'),
            size: "large",
			fields: [
				{
					"label" : "Components",
					"fieldname": "components",
					"fieldtype": "Table",
					"fields": [
                        {
                            "fieldname": "item_code",
                            "fieldtype": "Link",
                            "in_list_view": 1,
                            "label": "Item Code",
                            "options": "Item",
                            "reqd": 1,
                            "columns": 1,
                            change: function(){
                                const me = this;
                                frappe.call({
                                    "method": "aqiq_steel_builtup.overrides.sales_order.get_item_details",
                                    "args": {
                                        "item_code": me.value,
                                        "price_list": frm.doc.selling_price_list,
                                        "customer": frm.doc.customer,
                                        "transaction_date": frm.doc.transaction_date,
                                        "company": frm.doc.company
                                    },
                                    callback: function(r){
                                        if (r.message){
                                            me.doc.item_name = r.message.item_name;
                                            me.doc.qty = 1;
                                            me.doc.cost = r.message.cost;
                                            me.doc.cost_amount = me.doc.cost;
                                            me.doc.rate = r.message.rate;
                                            me.doc.amount = me.doc.rate;
                                            me.doc.surface_area = 1;
                                            me.doc.surface_area_amount = 1;
                                            me.doc.parent_item = item_code;
                                            frm.events.calculate_total_surface_amount(d)
                                            d.refresh();
                                        }
                                    }
                                })
                                
                            }
                           },
                           {
                            "fetch_from": "item_code.item_name",
                            "fieldname": "item_name",
                            "fieldtype": "Data",
                            "in_list_view": 1,
                            "label": "Item Name",
                            "columns": 1,
                            //"read_only": 1
                           },
                           {
                            "fieldname": "parent_item",
                            "fieldtype": "Link",
                            "label": "Parent Item",
                            "options": "Item",
                            "read_only": 1
                           },
                           {
                            "fieldname": "parent_name",
                            "fieldtype": "Data",
                            "hidden": 1,
                            "label": "Parent Name",
                            "read_only": 1
                           },
                           {
                            "fieldname": "qty_and_rate_section",
                            "fieldtype": "Section Break",
                            "label": "Qty and Rate"
                           },
                           {
                            "fieldname": "qty",
                            "fieldtype": "Float",
                            "in_list_view": 1,
                            "label": "Qty",
                            "columns": 1,
                            "default": 1,
                            change: function(){
                                const qty = this.value;
                                this.doc.amount = qty * this.doc.rate;
                                this.doc.cost_amount = qty * this.doc.cost;
                                this.doc.surface_area_amount = qty * this.doc.surface_area;
                                frm.events.calculate_total_surface_amount(d)
                                d.refresh();
                            }
                           },
                           {
                            "fetch_from": "item_code.surface_area",
                            "fieldname": "surface_area",
                            "fieldtype": "Float",
                            "label": "Surface Area",
                            "in_list_view": 1,
                            "columns": 1,
                            "default": 0,
                            change: function(){
                                const surface = this.value;
                                this.doc.surface_area_amount = this.doc.qty * surface;
                                frm.events.calculate_total_surface_amount(d)
                                d.refresh();
                            }
                           },
                           {
                            "fieldname": "cost",
                            "fieldtype": "Currency",
                            "label": "Cost",
                            "in_list_view": 1,
                            "options": "currency",
                            "columns": 1,
                            "default": 0,
                            change: function(){
                                const cost = this.value;
                                this.doc.cost_amount = this.doc.qty * cost;
                                d.refresh();
                            }
                           },
                           {
                            "fieldname": "rate",
                            "fieldtype": "Currency",
                            "label": "Rate",
                            "in_list_view": 1,
                            "options": "currency",
                            "columns": 1,
                            "default": 0,
                            change: function(){
                                const rate = this.value;
                                this.doc.amount = this.doc.qty * rate;
                                d.refresh();
                            }
                           },
                           {
                            "fieldname": "amount",
                            "fieldtype": "Currency",
                            "label": "Amount",
                            "options": "currency",
                            "read_only": 1,
                            "default": 0
                           },
                           {
                            "fieldname": "surface_area_amount",
                            "fieldtype": "Float",
                            "label": "Surface Area Amount",
                            "read_only": 1,
                            "default": 0
                           },
                           {
                            "fieldname": "cost_amount",
                            "fieldtype": "Currency",
                            "label": "Cost Amount",
                            "options": "currency",
                            "read_only": 1
                           },
                    ]
				},
                {
                    "fieldname": "sect_br1",
                    "fieldtype": "Section Break"
                },
                {
                    "fieldname": "col_br2",
                    "fieldtype": "Column Break"
                },
                {
                    "label" : "Total Surface Amount",
					"fieldname": "total_surface_amount",
					"fieldtype": "Float",
                    "read_only": 1,
                }
			],
			primary_action: function() {
                frm.events.calculate_total_surface_amount(d);
				var data = d.get_values();
                frappe.call({
                    method: "aqiq_steel_builtup.overrides.sales_order.update_components",
                    args: {
                        "parent_index": index,
                        "updates_data": data,
                        "sales_order": frm.doc.name
                    },
                    callback: function(r){
                        if (r.message){
                            frm.clear_table("components");
                            r.message.forEach(function(d) {
                                var c = frm.add_child("components");
                                    c.item_code =  d.item_code
                                    c.item_name = d.item_name
                                    c.qty = d.qty
                                    c.rate = d.rate
                                    c.base_rate = d.rate * frm.doc.conversion_rate
                                    c.amount = d.amount
                                    c.base_amount = d.amount * frm.doc.conversion_rate
                                    c.cost = d.cost
                                    c.cost_amount = d.cost_amount
                                    c.base_cost = d.cost * frm.doc.conversion_rate
                                    c.base_cost_amount = d.cost_amount * frm.doc.conversion_rate
                                    c.surface_area = d.surface_area
                                    c.surface_area_amount = d.surface_area_amount
                                    c.parent_item = d.parent_item
                                    c.parent_name = d.parent_name
                                
                            });
                            // frm.set_value("to_set_components", 0);
                            refresh_field("components");
                            d.hide();
                        }
                    }
                })
				
			},
			primary_action_label: __('Update')
		});
        function set_components_data (dialog) {
            let comp_items = [];
            let parent_name = '';
            for (const row of frm.doc.items){
                if (row.idx == index){
                    parent_name = row.name_id;
                    break;
                }
            }
            frm.doc.components.forEach(d => {
                if (d.parent_name == parent_name) {
                    comp_items.push({
                        "item_code": d.item_code,
                        "item_name": d.item_name,
                        "qty": d.qty,
                        "cost": d.cost,
                        "rate": d.rate,
                        "amount": d.amount,
                        "cost_amount": d.cost_amount,
                        "surface_area": d.surface_area,
                        "surface_area_amount": d.surface_area_amount,
                        "parent_item": d.parent_item,
                        "parent_name": d.parent_name
                    });
                }
            });
            
            dialog.fields_dict["components"].df.data = comp_items;
            frm.events.calculate_total_surface_amount(dialog)
            dialog.get_field("components").refresh();
			
		}
        set_components_data(d);
		
		d.show();
    },

    set_components: function(frm, row = null, method = null){
        if (row && !row.name_id){
            row.name_id = Date.now().toString(36);
        }
        
        let to_delete_components = [];
        if (frm.doc.components && frm.doc.components.length > 0){
            if (row){
                for (let comp of frm.doc.components){
                    
                        if (comp.parent_name == row.name_id){
                            to_delete_components.push(comp.name);
                        }
                }
            }

            else {
                for (let comp of frm.doc.components){
                    let found = false;
                    for (const item of frm.doc.items){
                        if (comp.parent_name == item.name_id){
                            found = true;
                            break;
                        }
                    }
                    if (!found) to_delete_components.push(comp.name);
                }
            }
    
            if (to_delete_components.length > 0){
                frm.doc.components = frm.doc.components.filter(comp => !to_delete_components.includes(comp.name));
            
                frm.refresh_field("components");
            }
        }
        
        if (method == "delete") return

        frappe.call({
            method: "aqiq_steel_builtup.overrides.sales_order.get_components",
            args: {
                "item": row.item_code,
                "selling_price_list": frm.doc.selling_price_list,
                "company": frm.doc.company,
                "customer": frm.doc.customer,
                "transaction_date": frm.doc.transaction_date
            }
        }).then((r) => {
            if(r.message) {
                r.message.forEach((comp) => {
                    var c = frm.add_child("components");
                    c.item_code = comp.item_code
                    c.item_name = comp.item_name
                    c.qty =comp.qty
                    c.parent_item = row.item_code
                    c.parent_name = row.name_id
                    c.surface_area = comp.surface_area
                    c.surface_area_amount = comp.surface_area * comp.qty
                    c.rate = comp.base_rate / frm.doc.conversion_rate
                    c.base_rate = comp.base_rate
                    c.amount = comp.base_amount / frm.doc.conversion_rate
                    c.base_amount = comp.base_amount
                    c.cost = comp. base_cost / frm.doc.conversion_rate
                    c.cost_amount = comp.base_cost_amount / frm.doc.conversion_rate
                    c.base_cost = comp.base_cost
                    c.base_cost_amount = comp.base_cost
                })
                refresh_field("components");
            }
        });


    }
    
})

frappe.ui.form.on("Sales Order Item", {
    height: function(frm, cdt, cdn){
        const row = locals[cdt][cdn]
        frappe.model.set_value(cdt, cdn, "qty", calculate_qty(row.width, row.height, row.pcs));
    },
    width: function(frm, cdt, cdn){
        const row = locals[cdt][cdn]
        frappe.model.set_value(cdt, cdn, "qty", calculate_qty(row.width, row.height, row.pcs));
    },
    pcs: function(frm, cdt, cdn){
        const row = locals[cdt][cdn]
        frappe.model.set_value(cdt, cdn, "qty", calculate_qty(row.width, row.height, row.pcs));
    },
    item_code: function(frm, cdt, cdn){
        const row = locals[cdt][cdn];
        frm.events.set_components(frm, row)
    },
    items_add: function(frm, cdt, cdn){
        let row = locals[cdt][cdn];
        row.name_id = Date.now().toString(36);
    },
    items_remove: function(frm, cdt, cdn){
        frm.events.set_components(frm, null, "delete")
    }
})

const calculate_qty = function(width, height, pcs){
    return (width * height / 1000000) * pcs
}


