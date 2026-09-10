# CampusCart --- Group Ordering for Campus Blinkit Users

## Problem

Blinkit is available on campus, but the **₹200 minimum order value**
makes small purchases inconvenient.

A student who only needs ₹40--₹80 worth of items has to either: - Add
unnecessary products to reach ₹200 - Ask friends to order together -
Wait until someone else is placing an order - Skip the purchase
altogether

## Solution

**CampusCart** is a campus-only group-ordering layer that lets students
combine their shopping needs with other students nearby.

Instead of requiring one student to spend ₹200:

> **Multiple students combine their items → the shared cart crosses ₹200
> → one order is placed → everyone pays only for their own items.**

### Example

  Student     Items            Value
  ----------- ----------- ----------
  A           Maggi              ₹45
  B           Chips              ₹55
  C           Ice cream          ₹70
  D           Drinks             ₹40
  **Total**                 **₹210**

The group crosses the minimum order value without anyone having to buy
unnecessary products.

------------------------------------------------------------------------

## Core Idea

### 1. Create or Join a Group Order

A student starts an order for their hostel/block.

Other students can join the same order and add their requirements.

### 2. Smart Order Matching

Instead of waiting for someone to create a group, a student can simply
enter what they want.

CampusCart finds other students who are:

-   Nearby
-   Ordering from the same store
-   Ordering within a similar time window
-   Compatible with the same delivery location

### 3. Automatic Minimum-Order Tracking

The system continuously calculates:

``` text
Current Group Total: ₹145
Minimum Required:    ₹200
Remaining:            ₹55
```

When the threshold is reached:

``` text
✓ Minimum order reached
₹235 / ₹200
```

### 4. Individual Cost Splitting

Every item belongs to a specific student.

The system calculates:

``` text
Student A → ₹65
Student B → ₹80
Student C → ₹90
----------------
Total     → ₹235
```

No manual calculation is required.

### 5. Campus-Based Delivery

Orders can be organized around:

-   Hostels
-   Blocks
-   Departments
-   Common campus locations

This makes coordination much easier than a normal public group-buying
platform.

------------------------------------------------------------------------

# Key Differentiator

CampusCart should **not** be just a shared cart.

The stronger concept is:

> **A real-time campus demand-matching network.**

Instead of:

**Student → Create group → Wait for people**

CampusCart becomes:

**Student need → Detect nearby compatible demand → Match automatically →
Cross ₹200 → Complete group order**

This makes the system useful even when nobody has explicitly created a
group.

------------------------------------------------------------------------

# Smart Matching Engine

A matching algorithm can score potential groups based on:

``` text
Match Score =
    Location proximity
  + Delivery-time similarity
  + Store compatibility
  + Existing cart value
  + Group reliability
```

For example:

``` text
Aadityaa wants ₹65 of snacks

Nearby active orders:

Hostel A — ₹165 — 2 mins away
Hostel B — ₹185 — 5 mins away
Hostel C — ₹90  — 1 min away

Best match → Hostel B

New total:
₹185 + ₹65 = ₹250
```

------------------------------------------------------------------------

# Potential Features

## Essential MVP

-   Campus login
-   Hostel/block selection
-   Create group order
-   Join group order
-   Add individual items
-   Live cart total
-   ₹200 threshold indicator
-   Automatic cost splitting
-   Order status
-   Notifications

## Advanced Features

### Smart Matching

Automatically match students with compatible pending orders.

### Expiry Timer

``` text
Order closes in 08:42
```

Prevents groups from remaining open indefinitely.

### Reliability Score

Students can build a reliability score based on:

-   Successful payments
-   Order confirmations
-   Cancellations
-   Pickup/drop coordination

### Popularity Prediction

Use historical campus ordering patterns to predict:

-   Popular products
-   Peak ordering times
-   Hostel-level demand
-   Likely group formation opportunities

### Demand Heatmap

Show anonymous demand around campus:

``` text
Hostel A
₹185 pending

Hostel B
₹120 pending

Hostel C
₹260 ✓ Order ready
```

------------------------------------------------------------------------

# Technical Architecture

``` text
                 ┌──────────────────┐
                 │   Student App    │
                 └────────┬─────────┘
                          │
                          ▼
                 ┌──────────────────┐
                 │   API Gateway    │
                 └────────┬─────────┘
                          │
              ┌───────────┼───────────┐
              ▼           ▼           ▼
       ┌────────────┐ ┌──────────┐ ┌──────────────┐
       │ Group      │ │ Matching │ │ Notification │
       │ Order      │ │ Engine   │ │ Service      │
       │ Service    │ │          │ │              │
       └─────┬──────┘ └────┬─────┘ └──────────────┘
             │             │
             └──────┬──────┘
                    ▼
             ┌──────────────┐
             │   Database   │
             └──────────────┘
```

## Suggested Stack

### Frontend

-   React / Next.js
-   React Native or Flutter for mobile

### Backend

-   Node.js / FastAPI
-   REST APIs or WebSockets

### Database

-   PostgreSQL

### Real-Time Layer

-   WebSockets
-   Redis

### Authentication

-   College email / campus SSO

### Matching

-   Rule-based algorithm initially
-   ML-based matching after sufficient usage data

------------------------------------------------------------------------

# Important Integration Constraint

The MVP should **not assume that Blinkit provides a public API for
third-party ordering**.

The safest architecture is to keep CampusCart as a coordination and
matching layer:

``` text
CampusCart
   ↓
Group formation
   ↓
Item + cost tracking
   ↓
Payment coordination
   ↓
Designated student places the actual Blinkit order
```

Before any production integration or automated ordering, Blinkit's
current terms, APIs, and permissions would need to be checked.

The product can therefore be demonstrated without automating or
impersonating Blinkit's app.

------------------------------------------------------------------------

# Hackathon Demo Flow

### Step 1

Student opens CampusCart.

``` text
📍 Hostel 7

What do you need?

[ Add items ]
```

### Step 2

Student adds:

``` text
Maggi       ₹45
Coke        ₹40
Chips       ₹35

Your total: ₹120
```

### Step 3

CampusCart detects another active order nearby:

``` text
🔥 Possible group nearby

Hostel 7
Current: ₹165
Distance: 40m

Add your ₹120?
```

### Step 4

The combined order becomes:

``` text
₹285 / ₹200

✓ Minimum order reached
```

### Step 5

Each student's amount is shown:

``` text
You: ₹120
Student B: ₹80
Student C: ₹85
```

### Step 6

The designated coordinator places the actual store order.

------------------------------------------------------------------------

# Why This Could Work on a Campus

The campus environment naturally creates the conditions needed for group
ordering:

-   High density of students
-   Repeated purchases
-   Shared hostels
-   Similar delivery locations
-   Frequent small-value purchases
-   Strong peer networks
-   Limited delivery radius

This makes the campus a much easier environment for demand aggregation
than a city-wide marketplace.

------------------------------------------------------------------------

# Future Expansion

CampusCart could eventually expand beyond one store or one minimum-order
problem.

### Multi-Store Grouping

Support multiple participating quick-commerce providers where permitted.

### Campus Marketplace

Students could request:

-   Snacks
-   Stationery
-   Electronics accessories
-   Medicines where legally appropriate
-   Daily essentials

### Scheduled Group Purchases

``` text
Every Friday — Hostel 5
Bulk snacks order
```

### Inter-Campus Network

Once the model works at one campus:

``` text
Campus A
Campus B
Campus C
Campus D
```

CampusCart could become a **campus commerce coordination platform**.

------------------------------------------------------------------------

# One-Line Pitch

> **CampusCart turns campus students into a real-time purchasing
> network, automatically combining small orders so nobody has to spend
> ₹200 just to get a few things they need.**

# Stronger Hackathon Pitch

> **"What if you never had to worry about Blinkit's ₹200 minimum again?
> CampusCart finds students around you who are ordering at the same
> time, combines your demand into one group order, and automatically
> splits the cost back to each person."**
