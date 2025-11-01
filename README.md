# Photogram API

A backend API for a photo-sharing application where users can share their photography works.

## Features

*   User authentication
*   Create, Read, Update, and Delete posts
*   Like and comment on posts
*   Follow other users

## Getting Started

### Prerequisites

*   .NET 7 SDK
*   Firebase Account (for authentication)

### Installation

1.  Clone the repo
2.  Add your Firebase configuration to `appsettings.json`
3.  Run the application

## API Endpoints

### User
* `POST /api/user/register` - Register a new user
* `POST /api/user/login` - Login a user
* `GET /api/user/{id}` - Get user by id
* `GET /api/user` - Get all users

### Post
* `POST /api/post` - Create a new post
* `GET /api/post` - Get all posts
* `GET /api/post/{id}` - Get post by id
* `PUT /api/post/{id}` - Update a post
* `DELETE /api/post/{id}` - Delete a post

### Comment
* `POST /api/comment` - Create a new comment
* `GET /api/comment/{postId}` - Get all comments for a post

### Like
* `POST /api/like/{postId}` - Like a post

## Technologies Used

*   ASP.NET Core 7
*   Firebase Authentication
