/** @odoo-module **/
odoo.define('wt_create_so_from_pos.ViewAllSalesOrderButton', function(require) {
    'use strict';

    const PosComponent = require('point_of_sale.PosComponent');
    const ProductScreen = require('point_of_sale.ProductScreen');
    const {useListener} = require('web.custom_hooks');
    const Registries = require('point_of_sale.Registries');

    class ViewAllSalesOrderButton extends PosComponent{
        constructor() {
            super(...arguments);
            useListener('click', this.onClick);
        }
        async onClick() {
            var self = this;
            this.showScreen('SaleOrderScreen');
        }
    }
    ViewAllSalesOrderButton.template = 'ViewAllSalesOrderButton';

    ProductScreen.addControlButton({
        component: ViewAllSalesOrderButton,
        condition: function() {
            return this.env.pos.config.create_so;
        },
    });

    Registries.Component.add(ViewAllSalesOrderButton);

    return ViewAllSalesOrderButton;
    
});