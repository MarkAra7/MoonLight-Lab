import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Badge, Button, Spinner } from "flowbite-react";
import { quizApi } from "@/api/quiz";
import { getErrorMessage } from "@/api";
import { useAuth } from "@/context/AuthContext";
import { mediaUrl, truncate, formatDate } from "@/utils/helpers";

const ShowQ = () => {
	const { quizId } = useParams();
	const navigate = useNavigate();
	const { user } = useAuth();
	const [quiz, setQuiz] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	const [ratings, setRatings] = useState({ average: 0, count: 0 });
	const [userRating, setUserRating] = useState(null);
	const [hoverRating, setHoverRating] = useState(0);
	const [ratingBusy, setRatingBusy] = useState(false);

	const [comments, setComments] = useState([]);
	const [commentBody, setCommentBody] = useState("");
	const [posting, setPosting] = useState(false);

	const isOwner = !!user && quiz?.author_id === user.id;

	useEffect(() => {
		const fetchAll = async () => {
			if (!quizId) {
				setError("Quiz ID is missing.");
				setLoading(false);
				return;
			}
			try {
				const [quizRes, ratingRes, commentRes, myRatingRes] = await Promise.all([
					quizApi.show(quizId),
					quizApi.ratings(quizId),
					quizApi.comments(quizId),
					quizApi.myRating(quizId).catch(() => ({ data: { rating: null } })),
				]);
				setQuiz(quizRes.data);
				setRatings({ average: ratingRes.data.average, count: ratingRes.data.count });
				setComments(commentRes.data);
				setUserRating(myRatingRes.data.rating);
			} catch (err) {
				setError(getErrorMessage(err, "Unable to load quiz."));
			} finally {
				setLoading(false);
			}
		};

		fetchAll();
	}, [quizId]);

	const handleRate = async (rating) => {
		if (ratingBusy) return;
		setRatingBusy(true);
		try {
			await quizApi.rate(quizId, { rating });
			setUserRating(rating);
			const res = await quizApi.ratings(quizId);
			setRatings({ average: res.data.average, count: res.data.count });
		} catch (err) {
			console.error("Failed to rate quiz:", err);
		} finally {
			setRatingBusy(false);
		}
	};

	const postComment = async (e) => {
		e.preventDefault();
		const body = commentBody.trim();
		if (!body || posting) return;
		setPosting(true);
		try {
			const res = await quizApi.comment(quizId, { body });
			setComments((prev) => [res.data, ...prev]);
			setCommentBody("");
		} catch (err) {
			console.error("Failed to post comment:", err);
		} finally {
			setPosting(false);
		}
	};

	const deleteComment = async (commentId) => {
		try {
			await quizApi.removeComment(commentId);
			setComments((prev) => prev.filter((c) => c.id !== commentId));
		} catch (err) {
			console.error("Failed to delete comment:", err);
		}
	};

	if (loading) {
		return (
			<main className="flex justify-center py-20">
				<Spinner size="lg" />
			</main>
		);
	}
	if (error) return <main><p role="alert" className="text-red-600">{error}</p></main>;
	if (!quiz) return <main><p>Quiz not found.</p></main>;

	const stars = [1, 2, 3, 4, 5];
	const questionsCount = quiz.questions_count || quiz.questions?.length || 0;

	return (
		<main className="mx-auto max-w-3xl px-4 py-8">
			<Link
				to="/"
				className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition-colors hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400"
			>
				<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
					<path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
				</svg>
				Back
			</Link>

			<div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/[0.06] dark:bg-white/[0.03]">
				{quiz.media && mediaUrl(quiz.media.file_path ?? quiz.media.url) && (
					<img
						src={mediaUrl(quiz.media.file_path ?? quiz.media.url)}
						alt={quiz.title}
						className="h-56 w-full object-cover"
					/>
				)}

				<div className="p-6">
					<div className="mb-3 flex flex-wrap items-center gap-2">
						{quiz.category && <Badge color="info" size="sm">{quiz.category.name}</Badge>}
						{quiz.difficulty && <Badge color="gray" size="sm">{quiz.difficulty}</Badge>}
						{quiz.quiz_status?.status === "draft" && <Badge color="warning" size="sm">Draft</Badge>}
					</div>

					<h1 className="mb-2 text-3xl font-bold text-slate-900 dark:text-white">
						{quiz.title}
					</h1>

					{quiz.description && (
						<p className="mb-5 text-slate-600 dark:text-slate-400">
							{truncate(quiz.description, 300)}
						</p>
					)}

					<div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-slate-200 pb-5 text-sm text-slate-500 dark:border-white/[0.06] dark:text-slate-400">
						{quiz.author && (
							<span className="flex items-center gap-2">
								{quiz.author.avatar && mediaUrl(quiz.author.avatar.file_path ?? quiz.author.avatar.url) ? (
									<img
										src={mediaUrl(quiz.author.avatar.file_path ?? quiz.author.avatar.url)}
										alt={quiz.author.name}
										className="h-6 w-6 rounded-full"
									/>
								) : (
									<div className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-xs font-semibold text-sky-600 dark:bg-sky-900/30 dark:text-sky-400">
										{quiz.author.name?.charAt(0)}
									</div>
								)}
								{quiz.author.name}
							</span>
						)}
						<span>{questionsCount} questions</span>
						{quiz.time_limit > 0 && <span>{quiz.time_limit} min</span>}
						{quiz.views > 0 && <span>{quiz.views} views</span>}
						{ratings.count > 0 && (
							<span>{ratings.average} ★ ({ratings.count})</span>
						)}
					</div>

					<div className="flex flex-wrap gap-3">
						<Button
							color="info"
							onClick={() => navigate(`/quizzes/${quiz.quiz_id}/play`)}
							className="inline-flex items-center gap-2 font-bold"
						>
							<svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
								<path d="M8 5.14v14l11-7-11-7z" />
							</svg>
							Play Quiz
						</Button>

						{isOwner && (
							<Button
								color="light"
								onClick={() => navigate(`/quizzes/${quiz.quiz_id}/edit`)}
								className="inline-flex items-center gap-2 font-semibold"
							>
								<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
									<path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
								</svg>
								Edit
							</Button>
						)}
					</div>
				</div>
			</div>

			{/* Rating window */}
			<section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/[0.06] dark:bg-white/[0.03]">
				<h2 className="mb-3 text-lg font-bold text-slate-900 dark:text-white">Rate this Quiz</h2>
				{user ? (
					<div className="flex flex-wrap items-center gap-3">
						<div className="flex gap-1">
							{stars.map((star) => (
								<button
									key={star}
									type="button"
									disabled={ratingBusy}
									onClick={() => handleRate(star)}
									onMouseEnter={() => setHoverRating(star)}
									onMouseLeave={() => setHoverRating(0)}
									className="p-0.5 disabled:cursor-not-allowed"
									aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
								>
									<svg
										className={`h-7 w-7 transition-colors ${
											star <= (hoverRating || userRating || 0)
												? "fill-amber-400 text-amber-400"
												: "fill-transparent text-slate-400"
										}`}
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
										strokeWidth={1.5}
									>
										<path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.5a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.563.563 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
									</svg>
								</button>
							))}
						</div>
						{userRating ? (
							<span className="text-sm text-slate-500 dark:text-slate-400">Your rating: {userRating}/5</span>
						) : (
							<span className="text-sm text-slate-500 dark:text-slate-400">Click a star to rate</span>
						)}
					</div>
				) : (
					<p className="text-sm text-slate-500 dark:text-slate-400">
						<Link to="/login" className="font-semibold text-sky-600 hover:underline dark:text-sky-400">
							Sign in
						</Link>{" "}
						to rate this quiz.
					</p>
				)}
			</section>

			{/* Comments */}
			<section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/[0.06] dark:bg-white/[0.03]">
				<h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
					Comments ({comments.length})
				</h2>

				{user ? (
					<form onSubmit={postComment} className="mb-5 flex gap-2">
						<input
							value={commentBody}
							onChange={(e) => setCommentBody(e.target.value)}
							placeholder="Write a comment..."
							required
							className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-sky-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
						/>
						<Button type="submit" color="info" disabled={posting}>
							{posting ? "Posting..." : "Post"}
						</Button>
					</form>
				) : (
					<p className="mb-5 text-sm text-slate-500 dark:text-slate-400">
						<Link to="/login" className="font-semibold text-sky-600 hover:underline dark:text-sky-400">
							Sign in
						</Link>{" "}
						to leave a comment.
					</p>
				)}

				{comments.length === 0 ? (
					<p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
						No comments yet. Be the first!
					</p>
				) : (
					<div className="space-y-3">
						{comments.map((comment) => (
							<div
								key={comment.id}
								className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/[0.06] dark:bg-white/[0.02]"
							>
								<div className="mb-2 flex items-start justify-between gap-2">
									<div className="flex items-center gap-2.5">
										<div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-sm font-bold text-sky-600 dark:bg-sky-900/30 dark:text-sky-400">
											{comment.user?.[0] || "?"}
										</div>
										<div>
											<div className="text-sm font-semibold text-slate-900 dark:text-white">
												{comment.user}
											</div>
											<div className="text-xs text-slate-500 dark:text-slate-400">
												{formatDate(comment.created_at)}
											</div>
										</div>
									</div>
									{user && (comment.username === user.username || isOwner) && (
										<button
											type="button"
											onClick={() => deleteComment(comment.id)}
											className="text-slate-400 transition-colors hover:text-red-500"
											aria-label="Delete comment"
										>
											<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
												<path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
											</svg>
										</button>
									)}
								</div>
								<p className="text-sm text-slate-700 dark:text-slate-300">{comment.body}</p>
							</div>
						))}
					</div>
				)}
			</section>
		</main>
	);
};

export default ShowQ;
