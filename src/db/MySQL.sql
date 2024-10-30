CREATE DATABASE message_app;

USE message_app;

CREATE TABLE Account (
	AccountId int,
    AccountName varchar(100),
    AccountPassword varchar(512)
);


/* Test Account without hashing: */
INSERT INTO account
VALUES (1, "Jan", "1234");