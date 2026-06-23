import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const API_BASE = "http://127.0.0.1:8000"

const difficultyColor = {
  Easy: "bg-green-500/10 text-green-500",
  Medium: "bg-yellow-500/10 text-yellow-500",
  Hard: "bg-red-500/10 text-red-500",
}

export default function App() {
  const [username, setUsername] = useState("")
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function fetchStats() {
    if (!username.trim()) return

    setLoading(true)
    setError(null)
    setData(null)

    try {
      const res = await fetch(`${API_BASE}/stats/${username}`)

      if (!res.ok) {
        throw new Error("User not found")
      }

      const json = await res.json()
      setData(json)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">LeetLens</h1>
          <p className="text-muted-foreground mt-1">
            Visualise your LeetCode progress
          </p>
        </div>

        {/* Search */}
        <div className="flex gap-3">
          <input
            className="flex-1 bg-muted rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 ring-ring"
            placeholder="Enter LeetCode username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchStats()}
          />

          <button
            onClick={fetchStats}
            className="bg-primary text-primary-foreground px-5 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition"
          >
            {loading ? "Loading..." : "Search"}
          </button>
        </div>

        {/* Error */}
        {error && <p className="text-red-500 text-sm">{error}</p>}

        {/* Results */}
        {data && (
          <div className="space-y-6">

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-1">
                  <CardTitle className="text-sm text-muted-foreground font-normal">
                    Total Solved
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{data.total_solved}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-1">
                  <CardTitle className="text-sm text-muted-foreground font-normal">
                    Easy
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-green-500">
                    {data.difficulty?.Easy ?? 0}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-1">
                  <CardTitle className="text-sm text-muted-foreground font-normal">
                    Medium
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-yellow-500">
                    {data.difficulty?.Medium ?? 0}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-1">
                  <CardTitle className="text-sm text-muted-foreground font-normal">
                    Hard
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-red-500">
                    {data.difficulty?.Hard ?? 0}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Topics */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Topics</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {data.topics?.map((t) => (
                  <span
                    key={t.name}
                    className="bg-muted text-muted-foreground text-xs px-3 py-1 rounded-full"
                  >
                    {t.name}{" "}
                    <span className="text-foreground font-medium">
                      {t.count}
                    </span>
                  </span>
                ))}
              </CardContent>
            </Card>

            {/* Problems Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Solved Problems</CardTitle>
              </CardHeader>

              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">#</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Difficulty</TableHead>
                      <TableHead>Topics</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {data.problems?.map((p) => (
                      <TableRow key={p.question_id}>
                        <TableCell className="text-muted-foreground">
                          {p.question_id}
                        </TableCell>

                        <TableCell>
                          <a
                            href={`https://leetcode.com/problems/${p.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:text-primary transition"
                          >
                            {p.title}
                          </a>
                        </TableCell>

                        <TableCell>
                          <span
                            className={`${difficultyColor[p.difficulty]} text-xs px-2 py-1 rounded-full font-medium`}
                          >
                            {p.difficulty}
                          </span>
                        </TableCell>

                        <TableCell className="flex flex-wrap gap-1">
                          {p.topics?.map((t) => (
                            <span
                              key={t}
                              className="bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full"
                            >
                              {t}
                            </span>
                          ))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

          </div>
        )}
      </div>
    </div>
  )
}