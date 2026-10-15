
import json
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path
from threading import Lock
from uuid import uuid4

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, EmailStr


# --------------------------------------------------
# Application setup
# --------------------------------------------------

app = FastAPI(
    title="Flower Shop API",
    description="A simple flower shop backend using JSON file storage.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5500",
        "http://127.0.0.1:5500",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
PRODUCTS_FILE = DATA_DIR / "products.json"
ORDERS_FILE = DATA_DIR / "orders.json"

# Prevent overlapping file operations within this process.
file_lock = Lock()


# --------------------------------------------------
# JSON file helpers
# --------------------------------------------------

def read_json(file_path: Path):
    """Read JSON data from a file."""
    try:
        with file_path.open("r", encoding="utf-8") as file:
            return json.load(file)
    except FileNotFoundError:
        raise HTTPException(
            status_code=500,
            detail=f"Required data file is missing: {file_path.name}",
        )
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=500,
            detail=f"Invalid JSON in {file_path.name}",
        )


def write_json(file_path: Path, data):
    """Write JSON safely using a temporary file and replacement."""
    temp_path = file_path.with_suffix(".tmp")

    try:
        with temp_path.open("w", encoding="utf-8") as file:
            json.dump(data, file, indent=2, ensure_ascii=False)
            file.write("\n")

        temp_path.replace(file_path)
    finally:
        if temp_path.exists():
            temp_path.unlink()


# --------------------------------------------------
# Request models
# --------------------------------------------------

class OrderItem(BaseModel):
    product_id: int = Field(gt=0)
    quantity: int = Field(gt=0, le=100)


class Customer(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    phone: str = Field(min_length=7, max_length=30)


class DeliveryAddress(BaseModel):
    street: str = Field(min_length=1, max_length=200)
    city: str = Field(min_length=1, max_length=100)
    state: str = Field(min_length=2, max_length=50)
    zip: str = Field(min_length=5, max_length=10)


class CreateOrderRequest(BaseModel):
    customer: Customer
    delivery_address: DeliveryAddress
    items: list[OrderItem] = Field(min_length=1, max_length=50)


# --------------------------------------------------
# Product endpoints
# --------------------------------------------------

@app.get("/")
def home():
    return {
        "message": "Welcome to the Flower Shop API",
        "docs": "/docs",
    }


@app.get("/api/products")
def get_products():
    """Return the flower catalog."""
    with file_lock:
        products = read_json(PRODUCTS_FILE)

    return products

@app.get("/api/about")
def get_about():
    return {
        "message": "Flower Shop"
    }


@app.get("/api/products/{product_id}")
def get_product(product_id: int):
    """Return one flower by ID."""
    with file_lock:
        products = read_json(PRODUCTS_FILE)

    for product in products:
        if product["id"] == product_id:
            return product

    raise HTTPException(status_code=404, detail="Product not found")


# --------------------------------------------------
# Order endpoints
# --------------------------------------------------

@app.post("/api/orders", status_code=201)
def create_order(request: CreateOrderRequest):
    """Validate and save a guest order."""

    with file_lock:
        products = read_json(PRODUCTS_FILE)
        orders = read_json(ORDERS_FILE)

        # Combine repeated product IDs into one line item.
        quantities = {}
        for item in request.items:
            quantities[item.product_id] = (
                quantities.get(item.product_id, 0) + item.quantity
            )

        product_by_id = {product["id"]: product for product in products}
        order_items = []
        subtotal = Decimal("0.00")

        for product_id, quantity in quantities.items():
            product = product_by_id.get(product_id)

            if product is None:
                raise HTTPException(
                    status_code=400,
                    detail=f"Product {product_id} does not exist",
                )

            if quantity > product.get("stock", 0):
                raise HTTPException(
                    status_code=400,
                    detail=f"Not enough stock for {product['name']}",
                )

            unit_price = Decimal(str(product["price"])).quantize(
                Decimal("0.01"),
                rounding=ROUND_HALF_UP,
            )
            line_total = unit_price * quantity
            subtotal += line_total

            order_items.append({
                "product_id": product["id"],
                "name": product["name"],
                "unit_price": float(unit_price),
                "quantity": quantity,
                "line_total": float(line_total),
            })

        subtotal = subtotal.quantize(Decimal("0.01"))
        order_id = str(uuid4())

        order = {
            "id": order_id,
            "customer": request.customer.model_dump(mode="json"),
            "delivery_address": request.delivery_address.model_dump(),
            "items": order_items,
            "subtotal": float(subtotal),
            "delivery_fee": 0.00,
            "total": float(subtotal),
            "status": "pending",
            "payment_status": "not_required",
        }

        orders.append(order)
        write_json(ORDERS_FILE, orders)

    return {
        "message": "Order created successfully",
        "order": order,
    }


@app.get("/api/orders/{order_id}")
def get_order(order_id: str):
    """Retrieve an order for local development and testing."""
    with file_lock:
        orders = read_json(ORDERS_FILE)

    for order in orders:
        if order["id"] == order_id:
            return order

    raise HTTPException(status_code=404, detail="Order not found")
