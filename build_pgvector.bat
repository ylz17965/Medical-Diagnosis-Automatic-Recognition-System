@echo off
set PGROOT=E:\PostgreSQL\18
cd /d e:\jsjsj_exercise_2\pgvector
call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat"
nmake /F Makefile.win
nmake /F Makefile.win install
