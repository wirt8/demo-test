"use client";

import { useQuery } from "@tanstack/react-query";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import HighchartsStock from "highcharts/highstock";
import toast from "react-hot-toast";
import { useEffect, useMemo, useState } from "react";

function HistoryChart({ data }: any) {
  type Trade = {
    order_id: string;
    time: string;
    market: string;
    side: string;
    size: number;
    leverage: number;
    notional_size?: number;
    mark_price?: number;
    status?: string;
  };

  const seriesData = data.markets.map((item: any, index: any) => ({
    name: item.title,
    type: 'spline',
    data: item.history.map((h: any) => [h.t * 1000, h.p * 100]),
    lineWidth: 3,
    // marker: { enabled: false },
  }));

  const expiryMs = useMemo(() => {
    const v = data?.expiry;
    const t = typeof v === 'number' ? v : Date.parse(v);
    return isNaN(t) ? 0 : t;
  }, [data?.expiry]);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const remaining = Math.max(0, expiryMs - now);
  const expired = remaining <= 0;
  const d = Math.floor(remaining / (24 * 60 * 60 * 1000));
  const h = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const m = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
  const s = Math.floor((remaining % (60 * 1000)) / 1000);

  const expiryLocal = useMemo(() => {
    if (!expiryMs) return '';
    try {
      return new Date(expiryMs).toLocaleString();
    } catch {
      return '';
    }
  }, [expiryMs]);

  const [leverage, setLeverage] = useState<number>(1);
  const [entrySize, setEntrySize] = useState<number>(0);
  const betCategory = useMemo(() => (
    Array.isArray(data?.markets) ? data.markets.map((item: any) => item.title) : []
  ), [data?.markets]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  const storageKey = `trade_history_nobel_peace_2025`;
  const [trades, setTrades] = useState<Trade[]>(JSON.parse(localStorage.getItem(storageKey) || '[]'));

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(trades));
    } catch { }
  }, [trades]);

  useEffect(() => {
    if (betCategory.length && !selectedCategory) {
      setSelectedCategory(betCategory[0]);
    }
  }, [betCategory, selectedCategory]);

  const handlePlaceTrade = () => {
    // if (!entrySize || leverage < 1 || leverage > 3) {
    //   toast.error("Please set a valid entry size and leverage (1x–3x).");
    //   return;
    // }
    toast.success(`Placed trade: ${selectedCategory}, ${leverage}x, size ${entrySize}`);
    const oldEntrySize = entrySize;
    setEntrySize(0);
    // call api /orders/place
    fetch("http://localhost:8000/orders/place", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        market_id: data.id,
        size: entrySize,
        leverage: leverage,
        entry_price: data.markets[0].history[0].p,
        side: selectedCategory,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        console.log('data', data);
        if (data.success) {
          toast.success(data.message);
          const t: Trade = {
            order_id: String(data.order_id ?? ''),
            time: new Date().toISOString(),
            market: data?.trade_details?.market ?? '',
            side: data?.trade_details?.side ?? selectedCategory,
            size: Number(data?.trade_details?.size ?? oldEntrySize ?? 0),
            leverage: Number(data?.trade_details?.leverage ?? leverage ?? 1),
            notional_size: Number(data?.trade_details?.notional_size ?? oldEntrySize * leverage ?? 0),
            mark_price: Number(data?.trade_details?.mark_price ?? 0),
            status: Object.keys(data?.hl_response?.response?.data?.statuses[0])[0].toString()
          };
          setTrades((prev) => [t, ...prev].slice(0, 100));
        } else {
          toast.error(data.message);
          setEntrySize(oldEntrySize);
        }
      })
      .catch((err) => {
        toast.error("Failed to place trade");
        setEntrySize(oldEntrySize);
      });
  };

  const options = {
    chart: {
      type: "spline",
      scrollablePlotArea: {
        minWidth: 600,
        scrollPositionX: 1,
      },
      width: 800,
      height: 600,
    },
    rangeSelector: {
      selected: 3,
      buttons: [
        { type: "week", count: 1, text: "1w" },
        { type: "month", count: 1, text: "1m" },
        { type: "all", text: "All" },
      ],
    },
    title: {
      text: data.title,
      align: "left",
    },
    subtitle: {
      text: data.subtitle,
      align: "left",
    },
    xAxis: {
      type: "datetime",
      labels: {
        overflow: "justify",
      },
    },
    yAxis: {
      labels: {
        format: "{value}%",
      },
      title: {
        text: "",
      },
    },
    tooltip: {
      shared: true,
      valueSuffix: " %",
      crosshairs: true,
    },
    plotOptions: {
      spline: {
        lineWidth: 4,
        states: {
          hover: {
            lineWidth: 5,
          },
        },
        marker: {
          enabled: false,
        },
        pointInterval: 3600000,
      },
      series: {
        showInLegend: true,
      },
    },
    legend: {
      enabled: true,
      align: "left",
      verticalAlign: "top",
      layout: "horizontal"
    },
    series: [
      ...seriesData,
    ],
    navigation: {
      menuItemStyle: {
        fontSize: "10px",
      },
    },
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <div className="mb-3 flex items-center justify-between text-sm text-gray-700">
        <div className="font-medium">
          {expired ? (
            <span className="text-red-600">Expired</span>
          ) : (
            <span>
              Expires in: <span className="font-semibold">{d}d {h}h {m}m {s}s</span>
            </span>
          )}
        </div>
        {expiryLocal && (
          <div className="text-gray-500">Expiry: {expiryLocal}</div>
        )}
      </div>
      <div className="flex justify-center">
        <HighchartsReact highcharts={HighchartsStock} constructorType="stockChart" options={options} />
      </div>

      <div className="mt-6 rounded-lg border p-4 bg-white/50">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Leverage: <span className="font-semibold">{leverage}x</span>
            </label>
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={leverage}
              onChange={(e) => setLeverage(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-2">Entry size</label>
            <input
              type="number"
              min={0}
              step={1}
              value={entrySize}
              onChange={(e) => setEntrySize(Number(e.target.value))}
              placeholder="0"
              className="w-full rounded-md text-black border px-3 py-2 focus:outline-none focus:ring"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-2">Bet category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full rounded-md text-black border px-3 py-2 focus:outline-none focus:ring bg-white"
            >
              {betCategory.map((title: string) => (
                <option key={title} value={title}>{title}</option>
              ))}
            </select>
          </div>

          <div className="flex sm:justify-end">
            <button
              type="button"
              onClick={handlePlaceTrade}
              disabled={!entrySize}
              className={`h-10 px-4 rounded-md text-white font-medium ${!entrySize
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700'
                }`}
            >
              Place Trade
            </button>
          </div>
        </div>
      </div>

      {/* Trade History */}
      <div className="mt-6 rounded-lg border p-4 bg-white/60">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-black">Trade History</h3>
        </div>
        {trades.length === 0 ? (
          <div className="text-sm text-gray-600">No trades yet. Place a trade to see it here.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-700 border-b">
                  <th className="py-2 pr-4">Time</th>
                  <th className="py-2 pr-4">Order ID</th>
                  <th className="py-2 pr-4">Side</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Size</th>
                  <th className="py-2 pr-4">Leverage</th>
                  <th className="py-2 pr-4">Notional</th>
                  <th className="py-2 pr-4">Mark</th>
                  <th className="py-2 pr-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((t) => (
                  <tr key={t.order_id + t.time} className="border-b last:border-0">
                    <td className="py-2 pr-4 text-gray-700">{new Date(t.time).toLocaleString()}</td>
                    <td className="py-2 pr-4 font-mono text-xs text-gray-700">{t.order_id}</td>
                    <td className="py-2 pr-4">
                      <span className={`px-2 py-1 rounded text-white text-xs ${t.side?.toLowerCase() === 'yes' ? 'bg-green-600' : 'bg-blue-600'}`}>
                        {t.side}
                      </span>
                    </td>
                    <td className="py-2 pr-4">
                      <span
                        className={`px-2 py-1 rounded text-white text-xs ${t.status === 'filled' ? 'bg-green-600' : t.status === 'canceled' ? 'bg-red-600' : t.status === 'resting' ? 'bg-amber-500' : 'bg-gray-500'
                          }`}
                      >
                        {t.status ?? 'unknown'}
                      </span>
                    </td>
                    <td className="text-gray-700 py-2 pr-4">{t.size}</td>
                    <td className="text-gray-700 py-2 pr-4">{t.leverage}x</td>
                    <td className="text-gray-700 py-2 pr-4">{t.notional_size ?? '-'}</td>
                    <td className="text-gray-700 py-2 pr-4">{t.mark_price ?? '-'}</td>
                    <td className="text-gray-700 py-2 pr-4">
                      <div className="flex items-center gap-3">
                        <button
                          className="text-xs text-blue-600 hover:underline"
                          onClick={async () => {
                            try {
                              const res = await fetch("http://localhost:8000/health");
                              const payload = await res.json();
                              const extract = (pl: any): { oid?: string; status: Trade['status'] } => {
                                try {
                                  if (Array.isArray(pl) && pl.length > 0) {
                                    const o = pl[0];
                                    const oid = String(o?.order?.order?.oid ?? '');
                                    const statusRaw = String(o?.order?.status ?? '').toLowerCase();
                                    const status = statusRaw === 'open' ? 'resting' : (statusRaw === 'filled' ? 'filled' : (statusRaw === 'canceled' ? 'canceled' : 'unknown')) as Trade['status'];
                                    return { oid, status };
                                  }
                                  const s = pl?.response?.data?.statuses?.[0];
                                  if (!s) return { oid: undefined, status: 'unknown' } as const;
                                  if (s.resting) return { oid: String(s.resting.oid), status: 'resting' } as const;
                                  if (s.filled) return { oid: String(s.filled.oid ?? s.filled.order_id ?? ''), status: 'filled' } as const;
                                  if (s.canceled) return { oid: String(s.canceled.oid ?? s.canceled.order_id ?? ''), status: 'canceled' } as const;
                                  return { oid: undefined, status: 'unknown' } as const;
                                } catch {
                                  return { oid: undefined, status: 'unknown' } as const;
                                }
                              };
                              const { oid, status } = extract(payload);
                              if (oid && oid === t.order_id) {
                                setTrades(prev => prev.map(x => x.order_id === t.order_id ? { ...x, status: status as Trade['status'] } : x));
                                toast.success('Status updated');
                              } else {
                                toast('No status update for this order', { icon: 'ℹ️' });
                              }
                            } catch (e) {
                              toast.error('Failed to refresh status');
                            }
                          }}
                        >
                          Refresh
                        </button>
                        {t.status === 'resting' && (
                          <button
                            className="text-xs text-red-600 hover:underline"
                            onClick={async () => {
                              if (!confirm('Cancel this resting order?')) return;
                              try {
                                const res = await fetch(`http://localhost:8000/orders/cancel`, {
                                  method: 'POST', body: JSON.stringify({ order_id: t.order_id }), headers: {
                                    "Content-Type": "application/json",
                                  }
                                });
                                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                                
                                setTrades(prev => prev.map(x => x.order_id === t.order_id ? { ...x, status: 'canceled' } : x));
                                toast.success('Order canceled');
                              } catch (e) {
                                toast.error('Failed to cancel order');
                              }
                            }}
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const MarketChart = () => {
  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ["markets"],
    queryFn: () =>
      fetch("http://localhost:8000/markets").then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res.json();
      }),
  });

  if (isLoading || isFetching) return <div>Loading...</div>;
  if (error) return <div>Error loading markets.</div>;

  return <div>
    <HistoryChart data={data[0]} />
  </div>
};

export default MarketChart;
