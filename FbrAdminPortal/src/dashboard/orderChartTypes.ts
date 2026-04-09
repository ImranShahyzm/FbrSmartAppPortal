/** Minimal shape for {@link OrderChart} (same as main app dashboard). */
export type ChartOrder = {
    id: string;
    date: Date;
    status: string;
    total: number;
};
