from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import SessionLocal
from models import User, SolvedQuestion, Topic

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://leetcode.com","http://localhost:5173"],
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

        # Step 1: Get or create user
        user = db.query(User).filter(User.username == username).first()

        if not user:
            user = User(username=username)
            db.add(user)
            db.flush()

        # Step 2: Delete old topics first, then solved questions
        old_question_ids = db.query(SolvedQuestion.id).filter(
            SolvedQuestion.user_id == user.id
        ).subquery()

        db.query(Topic).filter(
            Topic.solved_question_id.in_(old_question_ids)
        ).delete(synchronize_session=False)

        db.query(SolvedQuestion).filter(
            SolvedQuestion.user_id == user.id
        ).delete(synchronize_session=False)

        # Step 3: Bulk insert solved questions
        solved_questions = [
            SolvedQuestion(
                user_id=user.id,
                question_id=problem["question_id"],
                title=problem["title"],
                slug=problem["slug"],
                difficulty=problem["difficulty"]
            )
            for problem in problems
        ]

        db.bulk_save_objects(solved_questions, return_defaults=True)

        # Step 4: Bulk insert topics
        topics = [
            Topic(
                solved_question_id=sq.id,
                topic_name=topic
            )
            for sq, problem in zip(solved_questions, problems)
            for topic in problem["topics"]
        ]

        db.bulk_save_objects(topics)

        # Single commit for everything
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


@app.get("/stats/{username}")
async def stats(username: str):
    db: Session = SessionLocal()

    try:
        # Check user exists
        user = db.query(User).filter(User.username == username).first()

        if not user:
            raise HTTPException(status_code=404, detail=f"User '{username}' not found")

        # Total solved
        total_solved = db.query(SolvedQuestion).filter(
            SolvedQuestion.user_id == user.id
        ).count()

        # Difficulty breakdown
        difficulty_counts = db.query(
            SolvedQuestion.difficulty,
            func.count(SolvedQuestion.id)
        ).filter(
            SolvedQuestion.user_id == user.id
        ).group_by(
            SolvedQuestion.difficulty
        ).all()

        difficulty = {diff: count for diff, count in difficulty_counts}

        # Topic breakdown
        topic_counts = db.query(
            Topic.topic_name,
            func.count(Topic.id)
        ).join(
            SolvedQuestion,
            Topic.solved_question_id == SolvedQuestion.id
        ).filter(
            SolvedQuestion.user_id == user.id
        ).group_by(
            Topic.topic_name
        ).order_by(
            func.count(Topic.id).desc()
        ).all()

        topics = [{"name": name, "count": count} for name, count in topic_counts]

        # Full problem list
        problems = db.query(SolvedQuestion).filter(
            SolvedQuestion.user_id == user.id
        ).all()

        problem_list = [
            {
                "question_id": p.question_id,
                "title": p.title,
                "slug": p.slug,
                "difficulty": p.difficulty,
                "topics": [t.topic_name for t in p.topics]
            }
            for p in problems
        ]

        return {
            "username": username,
            "total_solved": total_solved,
            "difficulty": difficulty,
            "topics": topics,
            "problems": problem_list
        }

    except HTTPException:
        raise

    except Exception as e:
        print("Error:", e)
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        db.close()