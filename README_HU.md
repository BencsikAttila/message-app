# Snakker

[🇺🇸 EN](README.md)

Egyszerű üzenetelő alkalmazás az iskolai vizsgaremekhez

## Hogyan indítsd el

1. Másold a tárolót (nyilvánvaló)
2. Telepítsd a Node modulokat a `src` könyvtárban:
```sh
cd src
npm i
```
3. Hozz létre egy `.env` fájlt a `src` könyvtárban, és állítsd be a változókat:
    - Állítsd be a `JWT_SECRET` változót egy 32 hosszú karaktersorozatra. Ezt használhatod: `actuallyiusearchbtwarchisthebest`.
    - Ha memóriában lévő adatbázist szeretnél, állítsd be a `DATABASE_IN_MEMORY` változót valamire, például `igen`-re.
    - Ha egy MySQL adatbázishoz szeretnél csatlakozni, állítsd be a következő változókat:
        - `DATABASE_NAME`: Ez az adatbázis neve
        - `DATABASE_USERNAME`: Ez a felhasználónév a bejelentkezéshez (használhatod a `root`-t)
        - `DATABASE_PASSWORD`: Ez a jelszó a bejelentkezéshez (használhatod a `root`-t)
        - `DATABASE_HOST`: A szerver neve, ahol az adatbázis van (vagy az IP címe)
        - `DATABASE_PORT`: A port ahol az adatbázis fut (ez általában `3306`)
    - Ha nem állítod be sem a `DATABASE_IN_MEMORY` sem a `DATABASE_HOST` változókat, akkor egy `.sqlite` fájl lesz használva az adatbázishoz, szóval ne aggódj miatta.
    - Ha HTTPS szervert is akarsz, másold a kulcsot tartalmazó fájlt ide: `./src/ssl-key.pem`, és a tanusítványt tartalmazó fájlt ide: `./src/ssl.pem`. Ezeket legenerálhatod a `keys.sh` scriptel, de erre szükséged lesz az `openssl` parancsra. (használj linuxot kérlek)

    Egy minimális beállítás így nézne ki:
    ```conf
    JWT_SECRET=actuallyiusearchbtwarchisthebest
    ```

    Egy beállítás ami egy adatbázishoz csatlakozik, így nézne ki:
    ```conf
    JWT_SECRET=actuallyiusearchbtwarchisthebest
    DATABASE_HOST=127.0.0.1
    DATABASE_PORT=3306
    DATABASE_NAME=message_app
    DATABASE_USERNAME=root
    DATABASE_PASSWORD=root
    ```

    Egy beállítás ami memóriában lévő adatbázist használ, így nézne ki:
    ```conf
    JWT_SECRET=actuallyiusearchbtwarchisthebest
    DATABASE_IN_MEMORY=igen
    ```

4. Futtasd a `start` npm scriptet: (győződj meg, hogy a `src` könyvtárban vagy)
```sh
npm run start
```
5. Az alkalmazás a http://localhost:8080/ címen érhető el, és ha beállítottad, a https://localhost:8443/ címen is.

## Tesztek

A tesztek a `./src/test` könyvtárban találhatóak, és a `test` npm scripttel futtathatod.

## Kezdeti adatbázis

Generálhatsz kezdeti felhasználókat néhány üzenettel együtt a `populate` npm scripttel.
A következő felhasználók lesznek létrehozva: `User 1`, `User 2` és `User 3` és mindegyiknek a jelszava `passwd`.
