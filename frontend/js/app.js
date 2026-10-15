
const API_BASE_URL = "http://127.0.0.1:8000";

const productsContainer = document.getElementById("products");
const cartItemsContainer = document.getElementById("cart-items");
const cartCountElement = document.getElementById("cart-count");
const cartTotalElement = document.getElementById("cart-total");
const productMessage = document.getElementById("product-message");
const orderMessage = document.getElementById("order-message");
const checkoutForm = document.getElementById("checkout-form");
const placeOrderButton = document.getElementById("place-order-button");

let products = [];
const cart = new Map();

function formatPrice(price) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD"
    }).format(price);
}

function getFlowerEmoji(name) {
    const flower = name.toLowerCase();

    if (flower.includes("rose")) return "🌹";
    if (flower.includes("sunflower")) return "🌻";
    if (flower.includes("tulip")) return "🌷";
    if (flower.includes("lily")) return "💐";

    return "💐";
}

async function loadProducts() {
    productsContainer.innerHTML = "<p>Loading flowers...</p>";
    productMessage.textContent = "";
    productMessage.className = "message";

    try {
        const response = await fetch(`${API_BASE_URL}/api/products`);

        if (!response.ok) {
            throw new Error(`Server returned ${response.status}`);
        }

        const data = await response.json();

        // Supports either a plain array or { products: [...] }.
        products = Array.isArray(data) ? data : data.products;

        if (!Array.isArray(products)) {
            throw new Error("Unexpected product data format.");
        }

        renderProducts();
    } catch (error) {
        productsContainer.innerHTML = `
      <p>We couldn't load the flowers.</p>
    `;

        productMessage.textContent =
            "Check that your FastAPI backend is running and the API URL is correct.";

        productMessage.className = "message error";
        console.error("Loading products failed:", error);
    }
}

function renderProducts() {
    if (products.length === 0) {
        productsContainer.innerHTML = "<p>No flowers are available yet.</p>";
        return;
    }

    productsContainer.innerHTML = products.map(product => {
        const stock = Number(product.stock ?? 0);
        const quantityInCart = cart.get(product.id) || 0;
        const unavailable = stock <= 0;
        const limitReached = quantityInCart >= stock;

        return `
      <article class="product-card">
        <div class="product-art" aria-hidden="true">
          ${getFlowerEmoji(product.name)}
        </div>

        <div class="product-info">
          <h3>${escapeHtml(product.name)}</h3>
          <p>${escapeHtml(product.description || "A beautiful bouquet.")}</p>

          <div class="product-bottom">
            <span class="price">${formatPrice(Number(product.price))}</span>

            <button
              class="add-button"
              data-add="${escapeHtml(String(product.id))}"
              ${unavailable || limitReached ? "disabled" : ""}
            >
              ${unavailable ? "Out of stock" : limitReached ? "Stock limit" : "Add to cart"}
            </button>
          </div>
        </div>
      </article>
    `;
    }).join("");
}

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

function addToCart(productId) {
    const product = products.find(item => String(item.id) === String(productId));

    if (!product) return;

    const currentQuantity = cart.get(product.id) || 0;
    const stock = Number(product.stock ?? 0);

    if (currentQuantity >= stock) {
        productMessage.textContent = "You've reached the available stock for this flower.";
        productMessage.className = "message error";
        return;
    }

    cart.set(product.id, currentQuantity + 1);
    orderMessage.textContent = "";
    orderMessage.className = "message";

    renderProducts();
    renderCart();
}

function changeQuantity(productId, change) {
    const product = products.find(item => String(item.id) === String(productId));

    if (!product) return;

    const currentQuantity = cart.get(product.id) || 0;
    const newQuantity = currentQuantity + change;
    const stock = Number(product.stock ?? 0);

    if (newQuantity <= 0) {
        cart.delete(product.id);
    } else if (newQuantity <= stock) {
        cart.set(product.id, newQuantity);
    }

    renderProducts();
    renderCart();
}

function removeFromCart(productId) {
    const product = products.find(item => String(item.id) === String(productId));

    if (product) {
        cart.delete(product.id);
    }

    renderProducts();
    renderCart();
}

function renderCart() {
    let itemCount = 0;
    let total = 0;

    for (const [productId, quantity] of cart) {
        const product = products.find(item => item.id === productId);

        if (product) {
            itemCount += quantity;
            total += Number(product.price) * quantity;
        }
    }

    cartCountElement.textContent = itemCount;
    cartTotalElement.textContent = formatPrice(total);

    if (cart.size === 0) {
        cartItemsContainer.innerHTML =
            '<p class="muted">Your cart is empty. Add some flowers first!</p>';
        return;
    }

    cartItemsContainer.innerHTML = [...cart.entries()].map(
        ([productId, quantity]) => {
            const product = products.find(item => item.id === productId);

            if (!product) return "";

            return `
        <div class="cart-item">
          <div>
            <p>${escapeHtml(product.name)}</p>
            <small>${formatPrice(Number(product.price))} each</small>
          </div>

          <div class="quantity-controls">
            <button
              type="button"
              data-decrease="${escapeHtml(String(productId))}"
              aria-label="Decrease ${escapeHtml(product.name)} quantity"
            >−</button>

            <span>${quantity}</span>

            <button
              type="button"
              data-increase="${escapeHtml(String(productId))}"
              aria-label="Increase ${escapeHtml(product.name)} quantity"
              ${quantity >= Number(product.stock ?? 0) ? "disabled" : ""}
            >+</button>

            <button
              type="button"
              class="remove-button"
              data-remove="${escapeHtml(String(productId))}"
              aria-label="Remove ${escapeHtml(product.name)}"
            >×</button>
          </div>
        </div>
      `;
        }
    ).join("");
}

// Event delegation: handle product and cart buttons.
document.addEventListener("click", event => {
    const addButton = event.target.closest("[data-add]");
    const decreaseButton = event.target.closest("[data-decrease]");
    const increaseButton = event.target.closest("[data-increase]");
    const removeButton = event.target.closest("[data-remove]");

    if (addButton) {
        addToCart(addButton.dataset.add);
    } else if (decreaseButton) {
        changeQuantity(decreaseButton.dataset.decrease, -1);
    } else if (increaseButton) {
        changeQuantity(increaseButton.dataset.increase, 1);
    } else if (removeButton) {
        removeFromCart(removeButton.dataset.remove);
    }
});

checkoutForm.addEventListener("submit", async event => {
    event.preventDefault();

    orderMessage.textContent = "";
    orderMessage.className = "message";

    if (cart.size === 0) {
        orderMessage.textContent = "Please add at least one flower to your cart.";
        orderMessage.className = "message error";
        return;
    }

    const formData = new FormData(checkoutForm);

    const order = {
        customer: {
            name: formData.get("name").trim(),
            email: formData.get("email").trim(),
            phone: formData.get("phone").trim()
        },
        delivery_address: {
            street: formData.get("street").trim(),
            city: formData.get("city").trim(),
            state: formData.get("state").trim(),
            zip: formData.get("postal_code").trim()
        },
        items: [...cart.entries()].map(([productId, quantity]) => ({
            product_id: productId,
            quantity
        }))
    };

    placeOrderButton.disabled = true;
    placeOrderButton.textContent = "Placing order...";

    try {
        const response = await fetch(`${API_BASE_URL}/api/orders`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(order)
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
            const detail = typeof result.detail === "string"
                ? result.detail
                : JSON.stringify(result.detail || result);

            throw new Error(detail || `Request failed (${response.status})`);
        }

        const orderReference =
            result.order_id ?? result.id ?? result.id_order;

        orderMessage.textContent = orderReference
            ? `Order placed successfully! Order reference: ${orderReference}`
            : "Order placed successfully!";

        orderMessage.className = "message success";

        cart.clear();
        checkoutForm.reset();

        await loadProducts();
        renderCart();
    } catch (error) {
        orderMessage.textContent = `Could not place your order: ${error.message}`;
        orderMessage.className = "message error";
        console.error("Order submission failed:", error);
    } finally {
        placeOrderButton.disabled = false;
        placeOrderButton.textContent = "Place order";
    }
});

loadProducts();
