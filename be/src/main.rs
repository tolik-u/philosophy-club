use actix_web::{web, App, HttpResponse, HttpServer, Responder};
use actix_cors::Cors;
use mongodb::{options::ClientOptions, Client, Collection, bson::Document, bson::doc, options::AggregateOptions};
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

fn get_whiskies_collection(client: &web::Data<Mutex<Client>>) -> Collection<Document> {
    let client = client.lock().unwrap();
    let db = client.database("philosophy_club");
    db.collection::<Document>("whiskies")
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

#[derive(Deserialize)]
struct SearchQuery {
    query: String,
}

#[derive(Serialize, Deserialize)]
struct Whisky {
    name: String,
    age: String,
    strength: String,
    bottle_size: String,
    year_bottled: String
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

async fn search_whisky(query: web::Query<SearchQuery>, client: web::Data<Mutex<Client>>) -> impl Responder {
    let coll = get_whiskies_collection(&client);

    let pipeline = vec![
        doc! {
            "$search": {
                "index": "whiskies_idx",
                "autocomplete": {
                    "query": &query.query,
                    "path": "name",  // Searching by the "name" field
                    "tokenOrder": "sequential"
                }
            }
        },
        doc! {
            "$limit": 10  // Limit the number of results
        }
    ];

    let options = AggregateOptions::builder().build();

    let mut cursor = match coll.aggregate(pipeline, options).await {
        Ok(cursor) => cursor,
        Err(e) => {
            eprintln!("MongoDB Error: {:?}", e);
            return HttpResponse::InternalServerError().body("Failed to execute search query");
        }
    };
    
    let mut results = Vec::new();
    while let Some(result) = cursor.next().await {
        match result {
            Ok(doc) => {
                if let Ok(name) = doc.get_str("name") {
                    results.push(doc! { "name": name });
                }
            },
            Err(e) => {
                eprintln!("Error iterating cursor: {:?}", e);
                continue;
            }
        }
    }

    HttpResponse::Ok().json(results)
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
            .route("/search_whisky", web::get().to(search_whisky))

    })
    .bind("127.0.0.1:8080")?
    .run()
    .await
}

