odoo.define('wt_create_so_from_pos.SaleOrderScreenAll', function (require) {
    'use strict';

    const { useState } = owl.hooks;
    const PosComponent = require('point_of_sale.PosComponent');
    const Registries = require('point_of_sale.Registries');
    const { useListener } = require('web.custom_hooks');
    const models = require('point_of_sale.models');

    class SaleOrderScreenAll extends PosComponent {
        constructor() {
            super(...arguments);
            useListener('close-screen', this.back);
            useListener('click-sale-order', this._onClickSaleOrder);
            this.state = useState({
                orders: []
            });
        }
        async mounted(){
            super.mounted;
            this.state.orders = await this.orders();
        }
        back() {
            this.showScreen('ProductScreen');
        }
        get date() {
            return moment(this.order.date_order).format('YYYY-MM-DD hh:mm A');
        }

        async orders() {
            var result = Promise.resolve()
            result = await this.rpc({
                model: 'sale.order',
                method: 'search_read',
                kwargs: {
                    domain: [['state', '!=','cancel']],
                    fields: ['id', 'name', 'partner_id', 'date_order', 'state', 'amount_total', 'user_id'],
                }
            });
            return result;
        }

        async _onClickSaleOrder(event) {
            const clickedOrder = event.detail;
            const { confirmed, payload: selectedOption } = await this.showPopup('SelectionPopup',
                {
                    title: this.env._t('What do you want to do?'),
                    list: [{id:"0", label: this.env._t("Settle the order"), item: true}],
                });

            if(confirmed){
              let currentPOSOrder = this.env.pos.get_order();
              let sale_order = await this._getSaleOrder(clickedOrder.id);
              try {
                await this.env.pos.load_new_partners();
              }
              catch (error){
              }
              currentPOSOrder.set_client(this.env.pos.db.get_partner_by_id(sale_order.partner_id[0]));
              let orderFiscalPos = sale_order.fiscal_position_id ? this.env.pos.fiscal_positions.find(
                  (position) => position.id === sale_order.fiscal_position_id[0]
              )
              : false;
              if (orderFiscalPos){
                  currentPOSOrder.fiscal_position = orderFiscalPos;
              }
              let orderPricelist = sale_order.pricelist_id ? this.env.pos.pricelists.find(
                  (pricelist) => pricelist.id === sale_order.pricelist_id[0]
              )
              : false;
              if (orderPricelist){
                  currentPOSOrder.set_pricelist(orderPricelist);
              }

              if (selectedOption){
                // settle the order
                let lines = sale_order.order_line;
                let product_to_add_in_pos = lines.filter(line => !this.env.pos.db.get_product_by_id(line.product_id[0])).map(line => line.product_id[0]);
                if (product_to_add_in_pos.length){
                    const { confirmed } = await this.showPopup('ConfirmPopup', {
                        title: this.env._t('Products not available in POS'),
                        body:
                            this.env._t(
                                'Some of the products in your Sale Order are not available in POS, do you want to import them?'
                            ),
                        confirmText: this.env._t('Yes'),
                        cancelText: this.env._t('No'),
                    });
                    if (confirmed){
                        await this.env.pos._addProducts(product_to_add_in_pos);
                    }

                }

                let useLoadedLots;

                for (var i = 0; i < lines.length; i++) {
                    let line = lines[i];
                    if (!this.env.pos.db.get_product_by_id(line.product_id[0])){
                        continue;
                    }
                    console.log("estoy aca")
                    console.log(models)
                    let new_line = new models.Orderline({}, {
                        pos: this.env.pos,
                        order: this.env.pos.get_order(),
                        product: this.env.pos.db.get_product_by_id(line.product_id[0]),
                        description: line.name,
                        price: line.price_unit,
                        tax_ids: orderFiscalPos ? undefined : line.tax_id,
                        price_manually_set: true,
                        sale_order_origin_id: clickedOrder,
                        sale_order_line_id: line,
                        customer_note: line.customer_note,
                    });

                    if (
                        new_line.get_product().tracking !== 'none' &&
                        (this.env.pos.picking_type.use_create_lots || this.env.pos.picking_type.use_existing_lots) &&
                        line.lot_names.length > 0
                    ) {
                        // Ask once when `useLoadedLots` is undefined, then reuse it's value on the succeeding lines.
                        const { confirmed } =
                            useLoadedLots === undefined
                                ? await this.showPopup('ConfirmPopup', {
                                      title: this.env._t('SN/Lots Loading'),
                                      body: this.env._t(
                                          'Do you want to load the SN/Lots linked to the Sales Order?'
                                      ),
                                      confirmText: this.env._t('Yes'),
                                      cancelText: this.env._t('No'),
                                  })
                                : { confirmed: useLoadedLots };
                        useLoadedLots = confirmed;
                        if (useLoadedLots) {
                            new_line.setPackLotLines({
                                modifiedPackLotLines: [],
                                newPackLotLines: (line.lot_names || []).map((name) => ({ lot_name: name })),
                            });
                        }
                    }
                    console.log("esta aca 1")
                    console.log(new_line)
                    new_line.setQuantityFromSOL(line);
                    new_line.set_unit_price(line.price_unit);
                    new_line.set_discount(line.discount);
                    this.env.pos.get_order().add_orderline(new_line);
                }
              }
              console.log("esta aca 2")
              currentPOSOrder.trigger('change');
              this.back();
              console.log(" termina aca")
            }

        }

        async _getSaleOrder(id) {
            let sale_order = await this.rpc({
                model: 'sale.order',
                method: 'read',
                args: [[id],['order_line', 'partner_id', 'pricelist_id', 'fiscal_position_id', 'amount_total', 'amount_untaxed']],
                context: this.env.session.user_context,
              });

            let sale_lines = await this._getSOLines(sale_order[0].order_line);
            sale_order[0].order_line = sale_lines;

            return sale_order[0];
        }

        async _getSOLines(ids) {
          let so_lines = await this.rpc({
              model: 'sale.order.line',
              method: 'read_converted',
              args: [ids],
              context: this.env.session.user_context,
          });
          return so_lines;
        }
    }
    SaleOrderScreenAll.template = 'SaleOrderScreenAllWidget';
    SaleOrderScreenAll.defaultProps = {
    };

    Registries.Component.add(SaleOrderScreenAll);

    return SaleOrderScreenAll;
});