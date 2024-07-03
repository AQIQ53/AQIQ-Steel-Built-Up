import frappe

def validate_item(doc, method=None):
    if doc.components:
        for comp in doc.components:
            comp.parent_item = doc.item_code
            comp.surface_area_amount = comp.surface_area * comp.qty if comp.surface_area and comp.qty else 0
