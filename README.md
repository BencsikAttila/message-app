# Snakker

[HU](README_HU.md)

A simple message app for the school finals

## How to install

1. Clone the repository (obviously)
2. Install all the Node packages inside the `src` directory:
```sh
cd src
npm i
```
3. Create a `.env` file inside the `src` directory, and set the variables:
    - Set the`JWT_SECRET` variable to a 32 character long string. You can set it to `actuallyiusearchbtwarchisthebest`.
    - If you want an in-memory database, set the `DATABASE_IN_MEMORY` to some value, for example to `yes`.
    - If you want to connect to a MySQL server, set the following variables:
        - `DATABASE_NAME`: This specifies the database's name
        - `DATABASE_USERNAME`: The username to use for login (you can use `root`)
        - `DATABASE_PASSWORD`: The password to use for login (you can also use `root` here)
        - `DATABASE_HOST`: The hostname of the server where the database is (or IP address)
        - `DATABASE_PORT`: The port where the database service is listening to (usually `3306`)
    - If you don't specify either `DATABASE_IN_MEMORY` or `DATABASE_HOST`, an `.sqlite` file will be used for the database, so don't worry about it.
    - If you want a HTTPS server, copy the key file to `./src/ssl-key.pem`, and the certificate to `./src/ssl.pem`. You can generate these with the `keys.sh` script, but that requires the `openssl`. (use linux please)

    A minimal setup would look like this:
    ```conf
    JWT_SECRET=actuallyiusearchbtwarchisthebest
    ```

    A setup that connects to a database would look like this:
    ```conf
    JWT_SECRET=actuallyiusearchbtwarchisthebest
    DATABASE_HOST=127.0.0.1
    DATABASE_PORT=3306
    DATABASE_NAME=message_app
    DATABASE_USERNAME=root
    DATABASE_PASSWORD=root
    ```

    A setup that uses in-memory database would look like this:
    ```conf
    JWT_SECRET=actuallyiusearchbtwarchisthebest
    DATABASE_IN_MEMORY=yes
    ```

4. Run the npm script `start`: (make sure that you are in the `src` directory)
```sh
npm run start
```
5. You can access the app at http://localhost:8080/, and if you configured, at https://localhost:8443/ too.
