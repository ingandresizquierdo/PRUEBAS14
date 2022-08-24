# -*- coding: utf-8 -*-
from odoo import http


class Web14(http.Controller):
        
    @http.route('/introdoo', auth='public', website=True)
    def catalog(self, **kwargs):
        Book = http.request.env["web_14.web_14"]
        books = Book.sudo().search([])
        return http.request.render(
            "library_portal.book_catalog",
              {"books": books},
        )
    """
     @http.route('/web_14/web_14/objects/', auth='public')
     def list(self, **kw):
         return http.request.render('web_14.listing', {
             'root': '/web_14/web_14',
             'objects': http.request.env['web_14.web_14'].search([]),
         })

     @http.route('/web_14/web_14/objects/<model("web_14.web_14"):obj>/', auth='public')
     def object(self, obj, **kw):
         return http.request.render('web_14.object', {
             'object': obj
         })"""
