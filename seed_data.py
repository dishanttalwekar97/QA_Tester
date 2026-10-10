"""
Mock product catalog and seed state for ShopPulse target application.
"""

PRODUCTS = [
    {
        "id": 1,
        "name": "Aura Noise-Canceling Wireless Earbuds",
        "category": "Audio",
        "price": 79.99,
        "stock": 25,
        "rating": 4.8,
        "reviews_count": 42,
        "image": "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&auto=format&fit=crop&q=80",
        "description": "True wireless earbuds with active noise cancellation, ambient mode, and 32-hour battery life with Qi wireless charging case.",
        "features": ["Active Noise Cancellation", "IPX5 Water Resistant", "32-hour battery life", "Bluetooth 5.3"]
    },
    {
        "id": 2,
        "name": "Ergonomic Vertical Wireless Mouse",
        "category": "Accessories",
        "price": 49.99,
        "stock": 3,  # Limited stock for BUG-008
        "rating": 4.6,
        "reviews_count": 28,
        "image": "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=600&auto=format&fit=crop&q=80",
        "description": "Ergonomic handshake grip reduces forearm strain. Precision optical sensor with adjustable DPI from 800 to 2400.",
        "features": ["Ergonomic 57° vertical angle", "Whisper-quiet clicks", "3 levels of DPI adjustment", "Rechargeable 500mAh battery"]
    },
    {
        "id": 3,
        "name": "Smart Fitness Watch Ultra",
        "category": "Wearables",
        "price": 129.99,
        "stock": 15,
        "rating": 4.7,
        "reviews_count": 64,
        "image": "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80",
        "description": "All-day heart rate, SpO2 tracking, GPS sports tracking with AMOLED high-contrast touch screen and 7-day battery life.",
        "features": ["1.43\" AMOLED Display", "Built-in Dual GPS", "5ATM Water Resistance", "Over 100 Workout Modes"]
    },
    {
        "id": 4,
        "name": "Noise-Cancelling Headphones Pro",
        "category": "Audio",
        "price": 199.99,
        "stock": 0,  # Actually 0, but UI displays "In Stock (12 left)" for BUG-006
        "display_stock_override": "In Stock (12 left)",
        "rating": 4.9,
        "reviews_count": 91,
        "image": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80",
        "description": "Premium over-ear acoustic headphones with custom 40mm titanium drivers and memory foam cushioned earcups.",
        "features": ["Hybrid Active ANC", "Hi-Res Audio Certified", "40-Hour Playtime", "Multipoint Pairing"]
    },
    {
        "id": 5,
        "name": "4K Ultra-HD USB Streaming Webcam",
        "category": "Video",
        "price": 89.99,
        "stock": 18,
        "rating": 4.5,
        "reviews_count": 19,
        "image": "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=600&auto=format&fit=crop&q=80",
        "description": "Crisp 4K 30fps streaming with HDR, dual noise-reducing stereo microphones, and physical privacy shutter.",
        "features": ["Sony STARVIS sensor", "Autofocus & HDR", "Built-in Privacy Shutter", "Tripod-mountable"]
    },
    {
        "id": 6,
        "name": "Ultra-Slim Mechanical Keyboard",
        "category": "Accessories",
        "price": 149.99,
        "stock": 8,
        "rating": 4.8,
        "reviews_count": 55,
        "image": "/static/images/keyboard_broken.png",  # Broken image for BUG-014
        "description": "Low-profile optical red switches, CNC anodized aluminum frame, RGB backlighting, and Bluetooth 5.1 / 2.4GHz dual mode.",
        "features": ["Low Profile Optical Switches", "PBT Double-shot Keycaps", "Wireless + Wired Mode", "Customizable RGB"]
    },
    {
        "id": 7,
        "name": "Aluminum Ergonomic Laptop Stand",
        "category": "Accessories",
        "price": 39.99,
        "stock": 30,
        "rating": 4.9,
        "reviews_count": 73,
        "image": "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=600&auto=format&fit=crop&q=80",
        "description": "Elevates laptop to eye level for optimal posture. Precision-machined aluminum with heat-dissipating ventilation vents.",
        "features": ["Holds laptops up to 17 inches", "Non-slip silicone pads", "Foldable portable design", "Heat ventilation slot"]
    },
    {
        "id": 8,
        "name": "Wireless Fast Charging Pad Duo",
        "category": "Charging",
        "price": 29.99,
        "stock": 40,
        "rating": 4.4,
        "reviews_count": 31,
        "image": "https://images.unsplash.com/photo-1622445262464-84b1456045b6?w=600&auto=format&fit=crop&q=80",
        "description": "Dual 15W Qi fast charging pads for simultaneously powering your phone and earbuds. LED indicator with foreign-object detection.",
        "features": ["Dual 15W Fast Qi Coils", "Case-friendly charging", "Foreign Object Detection", "Slim non-slip base"]
    }
]

REVIEWS = {
    1: [
        {"author": "Sarah M.", "rating": 5, "comment": "The active noise cancellation is remarkable for daily commutes."},
        {"author": "David K.", "rating": 4, "comment": "Good audio fidelity and microphone clarity."}
    ],
    2: [
        {"author": "Elena R.", "rating": 5, "comment": "Solved my wrist pain within two days of using it."}
    ],
    3: [
        {"author": "Marcus B.", "rating": 5, "comment": "Accurate GPS tracking during long runs."}
    ]
}

