import * as React from 'react';
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import {
    TitleComponent,
    TooltipComponent,
    GridComponent,
    DatasetComponent,
    TransformComponent,
} from 'echarts/components';
import { LabelLayout, UniversalTransition } from 'echarts/features';
import { SVGRenderer } from 'echarts/renderers';
import { format, subDays, addDays } from 'date-fns';
import type {
    DatasetComponentOption,
    GridComponentOption,
    LineSeriesOption,
    TitleComponentOption,
    TooltipComponentOption,
} from 'echarts';
import type { ChartOrder } from './orderChartTypes';

const lastDay = new Date();
const lastMonthDays = Array.from({ length: 30 }, (_, i) => subDays(lastDay, i));
const aMonthAgo = subDays(new Date(), 30);

type ECOption = echarts.ComposeOption<
    | LineSeriesOption
    | TitleComponentOption
    | TooltipComponentOption
    | GridComponentOption
    | DatasetComponentOption
>;

echarts.use([
    TitleComponent,
    TooltipComponent,
    GridComponent,
    DatasetComponent,
    TransformComponent,
    LineChart,
    LabelLayout,
    UniversalTransition,
    SVGRenderer,
]);

const dateFormatter = (date: number): string => new Date(date).toLocaleDateString();

const aggregateOrdersByDay = (orders: ChartOrder[]): { [key: string]: number } =>
    orders
        .filter((order: ChartOrder) => order.status !== 'cancelled')
        .reduce(
            (acc, curr) => {
                const day = format(curr.date, 'yyyy-MM-dd');
                if (!acc[day]) acc[day] = 0;
                acc[day] += curr.total;
                return acc;
            },
            {} as { [key: string]: number }
        );

interface TotalByDay {
    date: number;
    total: number;
}

const getRevenuePerDay = (orders: ChartOrder[]): TotalByDay[] => {
    const daysWithRevenue = aggregateOrdersByDay(orders);
    return lastMonthDays.map(date => ({
        date: date.getTime(),
        total: daysWithRevenue[format(date, 'yyyy-MM-dd')] || 0,
    }));
};

const OrderChart = (props: { orders?: ChartOrder[] }) => {
    const { orders } = props;
    const chartRef = React.useRef<HTMLDivElement>(null);
    const chartInstance = React.useRef<echarts.ECharts | null>(null);

    React.useEffect(() => {
        if (!orders) return;
        if (chartRef.current) {
            if (!chartInstance.current) {
                chartInstance.current = echarts.init(chartRef.current);
            }

            const revenueData = getRevenuePerDay(orders);

            const option: ECOption = {
                xAxis: {
                    type: 'time',
                    min: addDays(aMonthAgo, 1).getTime(),
                    max: new Date().getTime(),
                    axisLabel: {
                        formatter: (value: number) => dateFormatter(value),
                    },
                },
                yAxis: {
                    type: 'value',
                    axisLabel: {
                        formatter: (value: number) =>
                            (Number(value) || 0).toLocaleString(undefined, {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0,
                            }),
                    },
                    splitLine: {
                        show: true,
                        lineStyle: {
                            type: [3, 4],
                            color: '#aaa',
                        },
                    },
                },
                tooltip: {
                    trigger: 'axis',
                    formatter: (params: any) => {
                        const param = params[0];
                        return `${dateFormatter(param.value[0])}: ${(Number(param.value[1]) || 0).toLocaleString(
                            undefined,
                            { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                        )}`;
                    },
                    axisPointer: {
                        type: 'line',
                        lineStyle: {
                            type: [3, 3],
                        },
                    },
                },
                grid: {
                    left: '0%',
                    right: '1%',
                    bottom: '0%',
                    top: '2%',
                    containLabel: true,
                },
                series: [
                    {
                        name: 'Revenue',
                        type: 'line',
                        smooth: true,
                        smoothMonotone: 'x',
                        symbol: 'none',
                        sampling: 'average',
                        areaStyle: {
                            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                                { offset: 0.05, color: 'rgba(136, 132, 216, 0.8)' },
                                { offset: 0.95, color: 'rgba(136, 132, 216, 0)' },
                            ]),
                        },
                        lineStyle: {
                            color: '#8884d8',
                            width: 2,
                        },
                        data: revenueData.map(item => [item.date, item.total]),
                    },
                ],
            };

            chartInstance.current.setOption(option);
        }

        const handleResize = () => {
            chartInstance.current?.resize();
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chartInstance.current?.dispose();
            chartInstance.current = null;
        };
    }, [orders]);

    return <div ref={chartRef} style={{ width: '100%', height: 300 }} />;
};

export default OrderChart;
