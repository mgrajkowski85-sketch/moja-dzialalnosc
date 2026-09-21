# Moja Działalność — wersja chmurowa

Aplikacja korzysta z Supabase jako bazy danych.

- logowanie e-mail + hasło,
- dokumenty w chmurze,
- klienci w chmurze,
- najnowsze dokumenty na górze,
- osobne drukowanie/PDF dokumentu,
- usuwanie klientów,
- usuwanie dokumentów,
- wybór istniejącego klienta przy wystawianiu dokumentu.

## Ważne
Klucz `sb_publishable_...` jest kluczem publicznym przeznaczonym do aplikacji przeglądarkowej. RLS w bazie ogranicza dostęp do danych zalogowanego użytkownika.

Po pierwszym zalogowaniu aplikacja pokazuje dane z tabel Supabase. Import 19 dokumentów z PANTAX trzeba wykonać po zalogowaniu, aby przypisać je do właściwego konta.
