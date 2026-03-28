@echo off
echo 正在安装 pgvector 到 PostgreSQL 18...

echo 复制 vector.dll...
copy /Y "e:\jsjsj_exercise_2\pgvector\vector.dll" "E:\PostgreSQL\18\lib\"

echo 复制 vector.control...
copy /Y "e:\jsjsj_exercise_2\pgvector\vector.control" "E:\PostgreSQL\18\share\extension\"

echo 复制 SQL 文件...
copy /Y "e:\jsjsj_exercise_2\pgvector\sql\vector--0.8.2.sql" "E:\PostgreSQL\18\share\extension\"
copy /Y "e:\jsjsj_exercise_2\pgvector\sql\vector.sql" "E:\PostgreSQL\18\share\extension\"

echo.
echo 安装完成！
echo 现在可以在 PostgreSQL 中运行: CREATE EXTENSION vector;
echo.
pause
