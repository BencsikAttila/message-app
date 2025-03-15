CREATE DATABASE message_app;

USE message_app;

CREATE TABLE messages (
    id INT AUTO_INCREMENT NOT NULL,
    content TEXT NOT NULL,
    createdUtc BIGINT NOT NULL,
    channelId INT NOT NULL,
    senderId INT NOT NULL,
    PRIMARY KEY (id)
);

CREATE TABLE channels (
    id INT AUTO_INCREMENT,
    name TEXT NOT NULL,
    ownerId INT NOT NULL,
    PRIMARY KEY (id)
);

CREATE TABLE users (
    id INT AUTO_INCREMENT,
    username TEXT NOT NULL,
    nickname TEXT NOT NULL,
    password VARCHAR(64) NOT NULL,
    PRIMARY KEY (id)
);
