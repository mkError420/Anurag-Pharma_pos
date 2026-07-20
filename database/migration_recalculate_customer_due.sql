-- Migration to recalculate customer due_balance from sales transactions only
-- Due Balance (Receivable) comes from Sales Transactions Due only

-- Recalculate customer due_balance based on:
-- Sales Transactions Due (sales.due_amount where due_amount > 0)

UPDATE customers c SET due_balance = (
    -- Sum of due amounts from sales transactions
    COALESCE((
        SELECT SUM(s.due_amount) 
        FROM sales s 
        WHERE s.customer_id = c.id AND s.shop_id = c.shop_id AND s.due_amount > 0
    ), 0)
) WHERE shop_id IN (SELECT id FROM shops);

-- Verify the recalculation
SELECT 
    c.id,
    c.name,
    c.shop_id,
    c.due_balance as total_due_balance_receivable,
    (SELECT SUM(s.due_amount) FROM sales s WHERE s.customer_id = c.id AND s.shop_id = c.shop_id AND s.due_amount > 0) as sales_transactions_due
FROM customers c
ORDER BY c.shop_id, c.id;
