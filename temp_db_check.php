<?php
$pdo = new PDO('mysql:host=127.0.0.1;dbname=multitenant_pos;charset=utf8mb4','root','', [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
$queries = [
    'sales_total_due' => 'SELECT SUM(due_amount) AS v FROM sales',
    'sales_due_count' => 'SELECT COUNT(*) FROM sales WHERE due_amount > 0',
    'held_total_due' => 'SELECT SUM(due_amount) AS v FROM held_bills',
    'held_pending_due' => 'SELECT SUM(due_amount) AS v FROM held_bills WHERE status = "held"',
    'held_due_from_sales' => 'SELECT SUM(due_amount) AS v FROM held_bills WHERE notes LIKE "Due from Sale %"',
    'held_due_from_manual' => 'SELECT SUM(due_amount) AS v FROM held_bills WHERE notes LIKE "Due from Manual Order Sale %"',
    'held_due_other' => 'SELECT SUM(due_amount) AS v FROM held_bills WHERE notes NOT LIKE "Due from Sale %" AND notes NOT LIKE "Due from Manual Order Sale %"',
];
foreach ($queries as $name => $sql) {
    $v = $pdo->query($sql)->fetchColumn();
    echo $name . ': ' . number_format((float)$v, 2, '.', ',') . "\n";
}
echo "\nTOP held bill note summaries:\n";
$rows = $pdo->query('SELECT notes, COUNT(*) AS cnt, SUM(due_amount) AS total FROM held_bills GROUP BY notes ORDER BY total DESC LIMIT 20')->fetchAll(PDO::FETCH_ASSOC);
foreach ($rows as $row) {
    echo substr($row['notes'], 0, 60) . ' | cnt=' . $row['cnt'] . ' | total=' . number_format((float)$row['total'], 2, '.', ',') . "\n";
}
