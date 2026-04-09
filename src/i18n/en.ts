import { TranslationMessages } from 'react-admin';
import englishMessages from 'ra-language-english';

const customEnglishMessages: TranslationMessages = {
    ...englishMessages,
    ra: {
        ...englishMessages.ra,
        auth: {
            ...englishMessages.ra.auth,
            username: 'Email',
        },
    },
    pos: {
        search: 'Search',
        configuration: 'Configuration',
        language: 'Language',
        theme: {
            name: 'Theme',
            light: 'Light',
            dark: 'Dark',
        },
        dashboard: {
            monthly_revenue: 'Monthly Revenue',
            month_history: '30 Day Revenue History',
            new_orders: 'New Orders',
            pending_reviews: 'Pending Reviews',
            all_reviews: 'See all reviews',
            new_customers: 'New Customers',
            all_customers: 'See all customers',
            pending_orders: 'Pending Orders',
            order: {
                items: 'by %{customer_name}, one item |||| by %{customer_name}, %{nb_items} items',
            },
            welcome: {
                title: 'Welcome to the react-admin e-commerce demo',
                subtitle:
                    "This is the admin of an imaginary poster shop. Feel free to explore and modify the data - it's local to your computer, and will reset each time you reload.",
                ra_button: 'react-admin site',
                demo_button: 'Source for this demo',
            },
        },
        menu: {
            sales: 'Sales',
            catalog: 'Catalog',
            customers: 'Customers',
        },
        events: {
            review: {
                title: 'Posted review on "%{product}"',
            },
            order: {
                title: 'Ordered 1 poster |||| Ordered %{smart_count} posters',
            },
        },
    },
    resources: {
        customers: {
            name: 'Customer |||| Customers',
            fields: {
                orders: 'Orders',
                first_seen: 'First seen',
                full_name: 'Name',
                groups: 'Segments',
                last_seen: 'Last seen',
                last_seen_gte: 'Visited Since',
                name: 'Name',
                total_spent: 'Total spent',
                password: 'Password',
                confirm_password: 'Confirm password',
                stateAbbr: 'State',
            },
            filters: {
                last_visited: 'Last visited',
                today: 'Today',
                this_week: 'This week',
                last_week: 'Last week',
                this_month: 'This month',
                last_month: 'Last month',
                earlier: 'Earlier',
                has_ordered: 'Has ordered',
                has_newsletter: 'Has newsletter',
                group: 'Segment',
            },
            fieldGroups: {
                identity: 'Identity',
                address: 'Address',
                stats: 'Stats',
                history: 'History',
                password: 'Password',
                change_password: 'Change Password',
            },
            page: {
                delete: 'Delete Customer',
            },
            errors: {
                password_mismatch:
                    'The password confirmation is not the same as the password.',
            },
            notifications: {
                created:
                    'Customer created |||| %{smart_count} customers created',
                updated:
                    'Customer updated |||| %{smart_count} customers updated',
                deleted:
                    'Customer deleted |||| %{smart_count} customers deleted',
            },
        },
        orders: {
            name: 'Order |||| Orders',
            amount: '1 order |||| %{smart_count} orders',
            title: 'Order %{reference}',
            fields: {
                basket: {
                    delivery: 'Delivery',
                    reference: 'Reference',
                    quantity: 'Quantity',
                    sum: 'Sum',
                    tax_rate: 'Tax Rate',
                    taxes: 'Tax',
                    total: 'Total',
                    unit_price: 'Unit Price',
                },
                address: 'Address',
                customer_id: 'Customer',
                date_gte: 'Passed Since',
                date_lte: 'Passed Before',
                nb_items: 'Nb Items',
                total_gte: 'Min amount',
                status: 'Status',
                returned: 'Returned',
            },
            section: {
                order: 'Order',
                customer: 'Customer',
                shipping_address: 'Shipping Address',
                items: 'Items',
                total: 'Totals',
            },
            invoice: {
                document: 'Invoice',
                invoice_date: 'Invoice date',
                payment_terms: 'Payment terms',
                reference: 'Reference',
                line_items: 'Order lines',
                columns: 'Columns',
                optional_columns: 'Optional columns',
                hs_code: 'HS Code',
                sro_number: 'SRO Number',
                sro_schedule_no: 'Sro Schedule No',
                sro_item: 'Sro Item',
                fbr_sale_type: 'FBR Sale type',
                discount_pct: 'Discount %',
                tax_amount: 'Tax amount',
                gross_amount: 'Gross amount',
                remarks: 'Remarks',
                sale_rate: 'Sale rate',
                net_amount: 'Net amount',
                add_a_line: 'Add a line',
                chatter: {
                    title: 'Chatter',
                    hint: 'Log notes, attach files, and track activity (stored in this browser).',
                    placeholder: 'Log an internal note…',
                    attach: 'Attach',
                    post: 'Post',
                    empty: 'No messages yet.',
                },
            },
            notifications: {
                created: 'Order created |||| %{smart_count} orders created',
                updated: 'Order updated |||| %{smart_count} orders updated',
                deleted: 'Order deleted |||| %{smart_count} orders deleted',
            },
        },
        fbrInvoices: {
            name: 'FBR Invoice |||| FBR Invoices',
            create_title: 'Create invoice',
            new_invoice_title: 'New invoice',
            reference_after_save: 'Assigned automatically when you save.',
            chatter_after_save:
                'Save the invoice once to enable chatter and attachments.',
            chatter: {
                stored_on_server: 'Notes and attachments are saved on the server with this invoice.',
            },
        },
        fbrScenarios: {
            name: 'FBR Scenario |||| FBR Scenarios',
            document: 'Scenario',
            new_title: 'New scenario',
            header_create: 'Scenario',
            subheader_hint: 'All changes are saved on the server.',
            fields: {
                scenario_code: 'Scenario code',
                description: 'Description',
                pdi_trans_type_id: 'PDI transaction type id',
            },
        },
        fbrSalesTaxRates: {
            name: 'Tax |||| Taxes',
            document: 'Tax',
            new_title: 'New tax',
            header_create: 'Tax',
            subheader_hint: 'All changes are saved on the server.',
            section: {
                definition: 'Tax definition',
            },
            fields: {
                tax_name: 'Tax name',
                tax_computation: 'Tax computation',
                active: 'Active',
                tax_type: 'Tax type',
                tax_scope: 'Tax scope',
                amount_percent: 'Amount (%)',
                effective_from: 'Effective from',
                effective_to: 'Effective to',
                label_on_invoices: 'Label on invoices',
                description: 'Description',
                tax_group: 'Tax group',
                include_in_analytic_cost: 'Include in analytic cost?',
                company: 'Company',
                country: 'Country',
                legal_notes: 'Legal notes',
                included_in_price: 'Included in price?',
                affect_base_subsequent: 'Affect base of subsequent taxes?',
            },
            tab: {
                definition: 'Definition',
                advanced: 'Advanced options',
            },
            chatter_after_save:
                'Save the tax rate once to enable chatter and attachments.',
            chatter: {
                stored_on_server:
                    'Notes and attachments are saved on the server with this tax rate.',
            },
        },
        invoices: {
            name: 'Invoice |||| Invoices',
            fields: {
                date: 'Invoice date',
                customer_id: 'Customer',
                order_id: 'Order',
                date_gte: 'Passed Since',
                date_lte: 'Passed Before',
                total_gte: 'Min amount',
                address: 'Address',
            },
            notifications: {
                created: 'Invoice created |||| %{smart_count} invoices created',
                updated: 'Invoice updated |||| %{smart_count} invoices updated',
                deleted: 'Invoice deleted |||| %{smart_count} invoices deleted',
            },
        },
        products: {
            name: 'Poster |||| Posters',
            fields: {
                category_id: 'Category',
                height_gte: 'Min height',
                height_lte: 'Max height',
                height: 'Height',
                image: 'Image',
                price: 'Price',
                reference: 'Reference',
                sales: 'Sales',
                stock_lte: 'Low Stock',
                stock: 'Stock',
                thumbnail: 'Thumbnail',
                width_gte: 'Min width',
                width_lte: 'Max width',
                width: 'Width',
            },
            tabs: {
                image: 'Image',
                details: 'Details',
                description: 'Description',
                reviews: 'Reviews',
            },
            filters: {
                categories: 'Categories',
                stock: 'Stock',
                no_stock: 'Out of stock',
                low_stock: '1 - 9 items',
                average_stock: '10 - 49 items',
                enough_stock: '50 items & more',
                sales: 'Sales',
                best_sellers: 'Best sellers',
                average_sellers: 'Average',
                low_sellers: 'Low',
                never_sold: 'Never sold',
            },
            notifications: {
                created: 'Poster created |||| %{smart_count} posters created',
                updated: 'Poster updated |||| %{smart_count} posters updated',
                deleted: 'Poster deleted |||| %{smart_count} posters deleted',
            },
        },
        categories: {
            name: 'Category |||| Categories',
            fields: {
                products: 'Products',
            },
            notifications: {
                created:
                    'Category created |||| %{smart_count} categories created',
                updated:
                    'Category updated |||| %{smart_count} categories updated',
                deleted:
                    'Category deleted |||| %{smart_count} categories deleted',
            },
        },
        reviews: {
            name: 'Review |||| Reviews',
            amount: '1 review |||| %{smart_count} reviews',
            relative_to_poster: 'Review on poster',
            detail: 'Review detail',
            fields: {
                customer_id: 'Customer',
                order_id: 'Order',
                product_id: 'Product',
                date_gte: 'Posted since',
                date_lte: 'Posted before',
                date: 'Date',
                comment: 'Comment',
                rating: 'Rating',
            },
            action: {
                accept: 'Accept',
                reject: 'Reject',
            },
            notifications: {
                created: 'Review created |||| %{smart_count} reviews created',
                updated: 'Review updated |||| %{smart_count} reviews updated',
                deleted: 'Review deleted |||| %{smart_count} reviews deleted',
                approved_success: 'Review approved',
                approved_error: 'Error: Review not approved',
                rejected_success: 'Review rejected',
                rejected_error: 'Error: Review not rejected',
            },
        },
        users: {
            name: 'User |||| Users',
        },
        companies: {
            name: 'Company |||| Companies',
            notifications: {
                fbr_pdi_synced: 'FBR PDI reference data synced.',
            },
        },
        segments: {
            name: 'Segment |||| Segments',
            fields: {
                customers: 'Customers',
                name: 'Name',
            },
            data: {
                compulsive: 'Compulsive',
                collector: 'Collector',
                ordered_once: 'Ordered once',
                regular: 'Regular',
                returns: 'Returns',
                reviewer: 'Reviewer',
            },
        },
    },
};

export default customEnglishMessages;
