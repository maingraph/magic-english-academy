"use client";

import { CheckCircle2, RefreshCw, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type PaymentOrder = {
  id: string;
  orderNumber: string;
  status: string;
  amountMinor: number;
  currency: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  paidAt: string | null;
  fulfilledAt: string | null;
  createdAt: string;
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
const statusLabels: Record<string, string> = {
  CREATED: "Создан",
  PENDING: "Ожидает",
  PAID: "Оплачен",
  DECLINED: "Отклонён",
  CANCELLED: "Отменён",
  REFUNDED: "Возвращён",
  ERROR: "Ошибка"
};

export function AdminPaymentsPanel() {
  const [orders, setOrders] = useState<PaymentOrder[]>([]);
  const [status, setStatus] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async (signal?: AbortSignal) => {
    const query = new URLSearchParams();
    if (status) query.set("status", status);
    if (email.trim()) query.set("email", email.trim());
    const response = await fetch(`${apiBaseUrl}/admin/payments?${query}`, {
      credentials: "include",
      cache: "no-store",
      signal
    });
    if (!response.ok) throw new Error("Не удалось загрузить платежи");
    const data = (await response.json()) as { orders: PaymentOrder[] };
    setOrders(data.orders);
  }, [email, status]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      load(controller.signal).catch((reason) => {
        if (reason instanceof Error && reason.name !== "AbortError") setError(reason.message);
      });
    }, 180);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [load]);

  async function action(id: string, path: string, method: "POST" | "PATCH", body?: object) {
    setBusy(id);
    setError("");
    try {
      const response = await fetch(`${apiBaseUrl}/admin/payments/${id}/${path}`, {
        method,
        credentials: "include",
        headers: body ? { "content-type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(typeof data.message === "string" ? data.message : "Операция не выполнена");
      }
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Операция не выполнена");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="workspace-panel payments-panel">
      <div className="panel-heading">
        <div><span>Альфа-Банк</span><h2>Платежи и выдача доступа</h2></div>
        <button type="button" onClick={() => load().catch(() => setError("Не удалось обновить платежи"))}>
          <RefreshCw size={16} /> Обновить
        </button>
      </div>
      <div className="payments-filters">
        <label><Search size={17} /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Поиск по email" /></label>
        <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Статус платежа">
          <option value="">Все статусы</option>
          {Object.entries(statusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
        </select>
      </div>
      {error ? <p className="form-message error">{error}</p> : null}
      <div className="payments-list">
        {orders.map((order) => (
          <article className="payment-row" key={order.id}>
            <div><strong>{order.customerName}</strong><small>{order.customerEmail}</small><small>{order.customerPhone ?? order.orderNumber}</small></div>
            <div><span className={`payment-status ${order.status.toLowerCase()}`}>{statusLabels[order.status] ?? order.status}</span><small>{new Date(order.createdAt).toLocaleString("ru-RU")}</small></div>
            <strong>{(order.amountMinor / 100).toFixed(2)} {order.currency}</strong>
            <div className="payment-actions">
              <button disabled={busy === order.id} type="button" onClick={() => action(order.id, "refresh", "POST")}><RefreshCw size={15} /> Проверить</button>
              {order.status === "PAID" ? (
                <button className={order.fulfilledAt ? "fulfilled" : ""} disabled={busy === order.id} type="button" onClick={() => action(order.id, "fulfilled", "PATCH", { fulfilled: !order.fulfilledAt })}>
                  <CheckCircle2 size={15} /> {order.fulfilledAt ? "Доступ выдан" : "Отметить выдачу"}
                </button>
              ) : null}
            </div>
          </article>
        ))}
        {!orders.length ? <p className="empty-state">Платежей по выбранному фильтру нет.</p> : null}
      </div>
    </section>
  );
}
