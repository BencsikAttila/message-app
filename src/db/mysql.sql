CREATE DATABASE message_app;

USE message_app;

CREATE TABLE messages (
    id int AUTO_INCREMENT NOT NULL,
    content text NOT NULL,
    createdUtc bigint NOT NULL,
    primary key (id)
);
