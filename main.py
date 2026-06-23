from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from database import SessionLocal
from models import User, SolvedQuestion, Topic

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://leetcode.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/analyze")
async def analyze(payload: dict):
    db: Session = SessionLocal()

    try:
        username = payload["username"]
        problems = payload["problems"]

        print(f"\nSyncing user: {username}")

        # Step 1: Check if user exists
        user = db.query(User).filter(User.username == username).first()

        if not user:
            user = User(username=username)
            db.add(user)
            db.commit()
            db.refresh(user)

        # Step 2: Delete old solved questions
        old_questions = db.query(SolvedQuestion).filter(
            SolvedQuestion.user_id == user.id
        ).all()

        for question in old_questions:
            db.delete(question)

        db.commit()

        # Step 3: Insert fresh solved questions
        for problem in problems:
            solved_question = SolvedQuestion(
                user_id=user.id,
                question_id=problem["question_id"],
                title=problem["title"],
                slug=problem["slug"],
                difficulty=problem["difficulty"]
            )

            db.add(solved_question)
            db.commit()
            db.refresh(solved_question)

            # Step 4: Insert topics
            for topic in problem["topics"]:
                topic_entry = Topic(
                    solved_question_id=solved_question.id,
                    topic_name=topic
                )

                db.add(topic_entry)

            db.commit()

        print(f"Successfully synced {len(problems)} problems.")

        return {
            "status": "success",
            "username": username,
            "synced_problems": len(problems)
        }

    except Exception as e:
        db.rollback()
        print("Error:", e)

        return {
            "status": "error",
            "message": str(e)
        }

    finally:
        db.close()