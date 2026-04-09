import * as React from 'react';
import { OdooSplitFormLayout } from '../common/layout/OdooSplitFormLayout';
import { ProductProfileChatter } from './ProductProfileChatter';

/** Odoo-like split: main form ~68% + product activity ~30% (desktop). */
export function ProductProfileFormLayout(props: { children: React.ReactNode }) {
    return (
        <OdooSplitFormLayout sidebar={<ProductProfileChatter />}>
            {props.children}
        </OdooSplitFormLayout>
    );
}
