from odoo import _, api, fields, models
import datetime


class SaleOrder(models.Model):
    _inherit = 'sale.order'

    is_pos_created = fields.Boolean(string='Create from POS')


    @api.model
    def craete_saleorder_from_pos(self, oderdetails):
        vals = {}
        saleorder_id = self.env['sale.order'].create({
            'partner_id': oderdetails.get('partner_id'),
            'date_order': datetime.date.today(),
            'is_pos_created': True,
            'state': 'draft',
            'amount_tax': oderdetails.get('tax_amount'),
            })
        vals['name'] = saleorder_id.name
        vals['id'] = saleorder_id.id
        for data in oderdetails:
            if not data == 'partner_id':
                current_dict = oderdetails.get(data)
                saleorder_id.order_line = [(0, 0, {
                    'product_id': current_dict.get('product'),
                    'product_uom_qty':  current_dict.get('quantity'),
                    'price_unit': current_dict.get('price'),
                    'discount': current_dict.get('discount'),
                })]
        return vals
    
    
class SaleOrder(models.Model):
    _inherit = 'sale.order.line'
    
    def read_converted(self):
        field_names = ["product_id", "name", "price_unit", "product_uom_qty", "tax_id", "qty_delivered", "qty_invoiced", "discount", "qty_to_invoice", "price_total"]
        results = []
        for sale_line in self:
            if sale_line.product_type:
                product_uom = sale_line.product_id.uom_id
                sale_line_uom = sale_line.product_uom
                item = sale_line.read(field_names)[0]
                if sale_line.product_id.tracking != 'none':
                    item['lot_names'] = sale_line.move_ids.move_line_ids.lot_id.mapped('name')
                if product_uom == sale_line_uom:
                    results.append(item)
                    continue
                item['product_uom_qty'] = self._convert_qty(sale_line, item['product_uom_qty'], 's2p')
                item['qty_delivered'] = self._convert_qty(sale_line, item['qty_delivered'], 's2p')
                item['qty_invoiced'] = self._convert_qty(sale_line, item['qty_invoiced'], 's2p')
                item['qty_to_invoice'] = self._convert_qty(sale_line, item['qty_to_invoice'], 's2p')
                item['price_unit'] = sale_line_uom._compute_price(item['price_unit'], product_uom)
                results.append(item)

            elif sale_line.display_type == 'line_note':
                if results:
                    results[-1]['customer_note'] = sale_line.name

        return results