console.log("LeetLens content script injected");

const QUERY = `
query problemsetQuestionList(
  $categorySlug: String,
  $limit: Int,
  $skip: Int,
  $filters: QuestionListFilterInput
) {
  problemsetQuestionList: questionList(
    categorySlug: $categorySlug
    limit: $limit
    skip: $skip
    filters: $filters
  ) {
    total: totalNum
    questions: data {
      questionFrontendId
      title
      titleSlug
      difficulty
      status
      topicTags {
        name
      }
    }
  }
}
`;

async function fetchProblems(skip = 0, limit = 100) {
    console.log(`Fetching problems: skip=${skip}, limit=${limit}`);

    const response = await fetch("https://leetcode.com/graphql/", {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            query: QUERY,
            variables: {
                categorySlug: "",
                skip,
                limit,
                filters: {}
            }
        })
    });

    const data = await response.json();
    console.log("GraphQL response received:", data);

    return data;
}

async function fetchAllSolved(username) {
    console.log(`Starting fetchAllSolved() for ${username}`);

    let skip = 0;
    let limit = 100;
    let total = null;
    let solved = [];

    while (true) {
        const data = await fetchProblems(skip, limit);

        if (!data?.data?.problemsetQuestionList) {
            console.error("Invalid GraphQL response:", data);
            return;
        }

        const result = data.data.problemsetQuestionList;

        if (total === null) {
            total = result.total;
            console.log("Total LeetCode problems:", total);
        }

        const solvedPage = result.questions
            .filter(q => q.status === "ac")
            .map(q => ({
                question_id: q.questionFrontendId,
                title: q.title,
                slug: q.titleSlug,
                difficulty: q.difficulty,
                topics: q.topicTags.map(tag => tag.name)
            }));

        solved.push(...solvedPage);

        console.log(
            `Scanned ${Math.min(skip + limit, total)}/${total} | Solved so far: ${solved.length}`
        );

        skip += limit;

        if (skip >= total) break;
    }

    const payload = {
        username,
        total_solved: solved.length,
        extracted_at: new Date().toISOString(),
        problems: solved
    };

    console.log("Final payload:", payload);

    try {
        const backendResponse = await fetch("http://127.0.0.1:8000/analyze", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const backendResult = await backendResponse.json();
        console.log("Backend response:", backendResult);
    } catch (err) {
        console.error("Failed to send payload to backend:", err);
    }

    chrome.runtime.sendMessage({
        type: "SUCCESS",
        solved: solved.length
    });
}

(async function () {
    const path = window.location.pathname;
    const segments = path.split("/").filter(Boolean);

    console.log("Path:", path);
    console.log("Segments:", segments);

    const isProfilePage =
        segments.length === 2 &&
        segments[0] === "u";

    console.log("Is Profile Page:", isProfilePage);

    if (!isProfilePage) {
        console.log("Not a valid LeetCode profile page.");
        return;
    }

    const username = segments[1];
    const runKey = `leetlens_ran_${username}`;

    if (sessionStorage.getItem(runKey)) {
        console.log(`Already ran for ${username}`);
        return;
    }

    sessionStorage.setItem(runKey, "true");

    console.log(`Profile page detected for ${username}. Running LeetLens...`);
    await fetchAllSolved(username);
})();