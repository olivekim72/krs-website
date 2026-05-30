// ===== 굿즈샵 상품 자동 렌더링 =====
// data/products.json 에 상품을 추가하면 카드가 자동 생성됩니다. (행사 렌더 방식과 동일)
// 사단법인 등록 전에는 결제 비활성 — "준비 중" 배지만 표시합니다.

async function loadProducts(targetId) {
  const target = document.getElementById(targetId);
  if (!target) return;
  try {
    const res = await fetch("data/products.json");
    const products = await res.json();
    target.innerHTML = products.map(function (p) {
      const thumb = p.image
        ? '<div class="event-thumb" style="background-image:url(\'' + p.image + "');background-size:cover;\"></div>"
        : '<div class="event-thumb">' + (p.emoji || "🌹") + "</div>";
      const price = p.price ? Number(p.price).toLocaleString("ko-KR") + "원" : "가격 미정";
      const soldout = (p.status && p.status !== "판매중");
      const badge = soldout
        ? '<span class="event-tag" style="background:#eee;color:#888">' + (p.status || "준비 중") + "</span>"
        : '<span class="event-tag">' + (p.category || "굿즈") + "</span>";
      return (
        '<article class="event-card product-card">' +
          thumb +
          '<div class="event-body">' +
            badge +
            "<h3>" + p.name + "</h3>" +
            '<p class="product-price">' + price + "</p>" +
            '<button class="btn btn-ghost product-btn" disabled>오픈 예정</button>' +
          "</div>" +
        "</article>"
      );
    }).join("");
  } catch (e) {
    target.innerHTML = "<p style='color:#999'>상품 정보를 불러오지 못했습니다. (data/products.json 확인)</p>";
  }
}
