# Flower Shop

A simple, locally run flower shop website built with a FastAPI backend. Customers can browse flowers, manage a shopping
cart, and submit an order.

## Features

-   Browse a flower catalog with images, descriptions, and prices
-   Add flowers to a shopping cart
-   Update quantities and remove items
-   Validate orders and calculate totals on the backend
-   Explore and test the API through FastAPI's interactive documentation

## Technology

-   **Frontend:** HTML, CSS, JavaScript
-   **Backend:** Python, FastAPI
-   **Local storage:** JSON files
-   **Development server:** Uvicorn

## Project structure

``` text
flower-shop/
├── frontend/
│   ├── index.html
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   └── app.js
│   └── images/
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── data/
│   │   ├── products.json
│   │   └── orders.json
│   └── tests/
└── README.md
```

The exact files may evolve as the project is implemented. The frontend
and backend are intentionally kept in separate directories.

## API overview

The initial API is intended to provide these endpoints:

  -----------------------------------------------------------------------
  Method                  Endpoint                Description
  ----------------------- ----------------------- -----------------------
  `GET`                   `/api/products`         List flowers

  `GET`                   `/api/products/{id}`    Get a flower by ID

  `POST`                  `/api/orders`           Validate and save a
                                                  guest order

  `GET`                   `/api/orders/{id}`      Retrieve an order for
                                                  local testing, if
                                                  enabled

  `GET`                   `/docs`                 Open interactive API
                                                  documentation
  -----------------------------------------------------------------------

These endpoints describe the planned interface; routes should be updated
in this README if the implementation changes.

## JSON data

-   `backend/data/products.json` stores the flower catalog.
-   `backend/data/orders.json` stores submitted orders.

The backend should calculate order totals using the product catalog
rather than trusting prices supplied by the browser. Keep a backup of
any order data you want to preserve.

JSON files are appropriate for a small local prototype. They are not a
robust storage solution for a busy production shop, especially when
multiple orders may be written at the same time.

Could be Stored in a database in future.

## Contributing

This is a small learning project. Feel free to fork it, experiment, and
adapt it to your needs.
