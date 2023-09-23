use actix_web::{web, App, HttpResponse, HttpServer, Responder};
use actix_cors::Cors;
use mongodb::{options::ClientOptions, Client, Collection, bson::Document, bson::doc};
use serde::{Serialize, Deserialize};
use futures::StreamExt;
use std::sync::Mutex;

async fn init_mongo_client() -> Client {
    let client_options = ClientOptions::parse(&std::env::var("MONGODB_URL").unwrap()).await.unwrap();
    Client::with_options(client_options).unwrap()
}

fn get_members_collection(client: &web::Data<Mutex<Client>>) -> Collection<Document> {
    let client = client.lock().unwrap();
    let db = client.database("philosophy_club");
    db.collection::<Document>("members")
}

#[derive(Serialize, Deserialize)]
struct Member {
    name: String,
    status: String,
}
#[derive(Serialize, Deserialize)]
struct DeleteMember {
    name: String,
}

async fn add_member(data: web::Json<Member>, client: web::Data<Mutex<Client>>) -> impl Responder {
    let members = get_members_collection(&client);
    let new_member = doc! {
        "name": &data.name,
        "status": &data.status,
    };
    members.insert_one(new_member, None).await.unwrap();

    HttpResponse::Ok().body("Member added")
}

async fn list_members(client: web::Data<Mutex<Client>>) -> impl Responder {
    let members = get_members_collection(&client);
    let mut cursor = match members.find(None, None).await {
        Ok(c) => c,
        Err(_) => return HttpResponse::InternalServerError().body("Failed to execute find query"),
    };

    let mut response: Vec<Member> = Vec::new();

    while let Some(result) = cursor.next().await {
        match result {
            Ok(document) => {
                let name = match document.get_str("name") {
                    Ok(n) => n,
                    Err(_) => continue, // Skip this document if it doesn't have a "name"
                };

                let status = match document.get_str("status") {
                    Ok(s) => s,
                    Err(_) => continue, // Skip this document if it doesn't have a "status"
                };

                let member = Member {
                    name: name.to_string(),
                    status: status.to_string(),
                };

                response.push(member);
            }
            Err(e) => {
                eprintln!("Error iterating cursor: {:?}", e);
                continue;
            }
        }
    }

    HttpResponse::Ok().json(response)
}


async fn delete_member(data: web::Json<DeleteMember>, client: web::Data<Mutex<Client>>) -> impl Responder {
    let members = get_members_collection(&client);
    let filter = doc! {
        "name": &data.name,
    };
    members.delete_one(filter, None).await.unwrap();

    HttpResponse::Ok().body("Member deleted")
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let client = init_mongo_client().await;
    let client_data = web::Data::new(Mutex::new(client));  // Wrap the client
    HttpServer::new(move || {
        let cors = Cors::permissive()
            .allow_any_origin()
            .allow_any_method()
            .allow_any_header();
        App::new()
            .app_data(client_data.clone())
            .wrap(cors)
            .route("/add_member", web::post().to(add_member))
            .route("/list_members", web::get().to(list_members))
            .route("/delete_member", web::post().to(delete_member))
    })
    .bind("127.0.0.1:8080")?
    .run()
    .await
}

