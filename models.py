from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False)

    solved_questions = relationship(
        "SolvedQuestion",
        back_populates="user",
        cascade="all, delete"
    )


class SolvedQuestion(Base):
    __tablename__ = "solved_questions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))

    question_id = Column(String, nullable=False)
    title = Column(String, nullable=False)
    slug = Column(String, nullable=False)
    difficulty = Column(String, nullable=False)

    user = relationship(
        "User",
        back_populates="solved_questions"
    )

    topics = relationship(
        "Topic",
        back_populates="solved_question",
        cascade="all, delete"
    )


class Topic(Base):
    __tablename__ = "topics"

    id = Column(Integer, primary_key=True, index=True)
    solved_question_id = Column(
        Integer,
        ForeignKey("solved_questions.id")
    )

    topic_name = Column(String, nullable=False)

    solved_question = relationship(
        "SolvedQuestion",
        back_populates="topics"
    )