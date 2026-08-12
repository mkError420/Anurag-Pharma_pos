# Purchase Order CSV Upload Guide

This guide explains how to upload product lists via CSV file for purchase orders in the Shop admin dashboard.

## Location
- Navigate to **Suppliers** → **Purchase Orders** tab
- Click **"Create Purchase Order"** button
- In the modal, scroll down to **"Or Upload Products via CSV"** section
- Click **"Show CSV Upload"** to expand the upload area

## CSV Format

### Required Columns
- `product_name` - Name of the product (required)
- `cost_price` - Purchase cost price per unit (required, must be a positive number)
- `quantity_ordered` - Quantity to order (required, must be a positive number)

### Optional Columns
- `sku` - Product SKU/code (auto-generated if not provided)
- `category` - Product category
- `selling_price` - Selling price for the product
- `expiry_date` - Expiration date (YYYY-MM-DD format)
- `unit` - Unit of measurement (default: piece)

## Example CSV File

```csv
product_name,sku,category,cost_price,selling_price,quantity_ordered,expiry_date,unit
Paracetamol 500mg,PAR-001,Medicine,5.00,8.00,100,2025-12-31,tablet
Amoxicillin 250mg,AMX-002,Medicine,12.50,20.00,50,2025-06-30,capsule
Vitamin C 1000mg,VIT-003,Supplements,8.00,15.00,200,2026-01-15,tablet
Bandage 5cm,BAN-004,Medical Supplies,2.00,5.00,100,,piece
Hand Sanitizer 500ml,HAN-005,Hygiene,15.00,25.00,30,2025-08-20,bottle
```

## Important Notes

1. **Column Order**: The columns can be in any order, but headers must match the column names listed above
2. **Case Insensitive**: Column headers are case-insensitive (e.g., "Product_Name" or "PRODUCT_NAME" both work)
3. **Required Fields**: Only `product_name`, `cost_price`, and `quantity_ordered` are required
4. **Auto-SKU**: If SKU is not provided, it will be auto-generated using the product name
5. **Validation**: The system will validate each row and report any errors
6. **Cart Addition**: Valid products are added to the purchase order cart automatically
7. **Error Handling**: If some rows have errors, valid rows will still be added to the cart

## CSV Upload Process

1. Prepare your CSV file following the format above
2. In the Purchase Order modal, click "Show CSV Upload"
3. Select your CSV file using the file input
4. Click "Upload CSV" button
5. Review the success/error messages
6. Uploaded products will appear in the Order Cart below
7. Complete the purchase order as usual

## Error Messages

Common errors you might encounter:
- "CSV file must contain at least a header row and one data row"
- "CSV must contain columns: product_name, cost_price, quantity_ordered"
- "Row X: Product name is required"
- "Row X: Invalid cost price"
- "Row X: Invalid quantity"
- "No valid products found in CSV"

## Tips

- Use a spreadsheet application (Excel, Google Sheets) to create your CSV
- Export as CSV (Comma Separated Values) format
- Test with a small batch first before uploading large files
- Keep product names consistent with your inventory
- Double-check cost prices and quantities before uploading
