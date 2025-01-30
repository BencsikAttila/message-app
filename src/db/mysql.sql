CREATE DATABASE message_app;

USE message_app;

CREATE TABLE messages (
	id bigint AUTO_INCREMENT NOT NULL,
    content text NOT NULL,
    createdUtc int NOT NULL,
    primary key (id)
);
