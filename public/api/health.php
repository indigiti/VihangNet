<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
echo json_encode(['ok'=>true,'app'=>'VihangNet','visualizer'=>'web-audio','python_analysis'=>false],JSON_THROW_ON_ERROR);
