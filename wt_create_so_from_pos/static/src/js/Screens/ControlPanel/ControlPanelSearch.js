odoo.define('wt_create_so_from_pos.ControlPanelSearch', function(require) {
    'use strict';

    const PosComponent = require('point_of_sale.PosComponent');
    const Registries = require('point_of_sale.Registries');
    const { useAutofocus, useListener } = require('web.custom_hooks');

    const ValidateFields =  new Set(['date', 'customer', 'client', 'order']);
    const FieldMap = {
        date: 'date_order',
        customer: 'partner_id.display_name',
        client: 'partner_id.display_name',
        order: 'name',
    };

    class ControlPanelSearch extends PosComponent{
        constructor(){
            super(...args);
            this.orderManagementContext = useContext(contexts.orderManagement);
            useListener('clear-search', this._onClearSearch);
            useAutofocus({ selector: 'input' });
            let currentClient = this.env.pos.get_client();
            if (currentClient) {
                this.orderManagementContext.searchString = currentClient.name;
                let domain = this._computeDomain();
                SaleOrderFetcher.setSearchDomain(domain);
            }
        }

        onInputKeydown(event) {
            if (event.key === 'Enter') {
                this.trigger('search', this._computeDomain());
            }
        }
        get showPageControls() {
            return SaleOrderFetcher.lastPage > 1;
        }
        get pageNumber() {
            const currentPage = SaleOrderFetcher.currentPage;
            const lastPage = SaleOrderFetcher.lastPage;
            return isNaN(lastPage) ? '' : `(${currentPage}/${lastPage})`;
        }
        get validSearchTags() {
            return VALID_SEARCH_TAGS;
        }
        get fieldMap() {
            return FIELD_MAP;
        }
        get searchFields() {
            return SEARCH_FIELDS;
        }
        _computeDomain() {
            let domain = [['state', '!=', 'cancel'],['invoice_status', '!=', 'invoiced']];
            const input = this.orderManagementContext.searchString.trim();
            if (!input) return domain;

            const searchConditions = this.orderManagementContext.searchString.split(/[,&]\s*/);
            if (searchConditions.length === 1) {
                let cond = searchConditions[0].split(/:\s*/);
                if (cond.length === 1) {
                  domain = domain.concat(Array(this.searchFields.length - 1).fill('|'));
                  domain = domain.concat(this.searchFields.map((field) => [field, 'ilike', `%${cond[0]}%`]));
                  return domain;
                }
            }

            for (let cond of searchConditions) {
                let [tag, value] = cond.split(/:\s*/);
                if (!this.validSearchTags.has(tag)) continue;
                domain.push([this.fieldMap[tag], 'ilike', `%${value}%`]);
            }
            return domain;
        }
        _onClearSearch() {
            this.orderManagementContext.searchString = '';
            this.onInputKeydown({ key: 'Enter' });
        }
    }
    ControlPanelSearch.template = 'ControlPanelSearch';

    Registries.Component.add(ControlPanelSearch);

    return ControlPanelSearch;
});