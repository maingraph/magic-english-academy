const apiBaseUrl = "__PAYMENT_API_URL__";
const token = new URLSearchParams(window.location.search).get("payment");
const title = document.querySelector("[data-title]");
const message = document.querySelector("[data-message]");
const order = document.querySelector("[data-order]");
const amount = document.querySelector("[data-amount]");
const mark = document.querySelector(".mark");

function render(data) {
  const paid = data.status === "paid";
  title.textContent = paid ? "Оплата подтверждена" : data.status === "declined" ? "Оплата отклонена" : "Проверяем оплату";
  message.textContent = data.message;
  order.textContent = `Заказ ${data.orderNumber}`;
  amount.textContent = `${(data.amountMinor / 100).toFixed(2)} ${data.currency}`;
  mark.textContent = paid ? "✓" : data.status === "declined" ? "×" : "…";
  return paid || ["declined", "cancelled", "refunded", "error"].includes(data.status);
}

async function check(attempt = 0) {
  if (!token) {
    title.textContent = "Платёж не найден";
    message.textContent = "Ссылка не содержит номера платежа. Обратитесь в поддержку.";
    return;
  }
  try {
    const response = await fetch(`${apiBaseUrl}/payments/orders/${encodeURIComponent(token)}`, { cache: "no-store" });
    if (!response.ok) throw new Error();
    const terminal = render(await response.json());
    if (!terminal && attempt < 5) window.setTimeout(() => check(attempt + 1), 2_000);
  } catch {
    title.textContent = "Не удалось проверить оплату";
    message.textContent = "Обновите страницу или напишите в службу заботы.";
  }
}

void check();
