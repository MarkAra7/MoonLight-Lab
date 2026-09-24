<?php

namespace App\Http\Controllers\Api\V1\Category;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCategoryRequest;
use App\Http\Requests\UpdateCategoryRequest;
use App\Http\Resources\CategoryResource;
use App\Models\Category;

class CategoryController extends Controller
{
    public function index()
    {
        return CategoryResource::collection(Category::with('media')
            ->withCount(['quizzes' => function ($q) {
                $q->where('is_public', true)
                    ->whereHas('quizStatus', fn($qs) => $qs->where('status', 'published'));
            }])
            ->get());
    }

    public function store(StoreCategoryRequest $request)
    {
        $category = Category::create($request->validated());

        return response()->json(new CategoryResource($category->load('media')), 201);
    }

    public function show(Category $category)
    {
        return new CategoryResource($category->load('media'));
    }

    public function update(UpdateCategoryRequest $request, Category $category)
    {
        $category->update($request->validated());

        return response()->json(new CategoryResource($category->load('media')));
    }

    public function destroy(Category $category)
    {
        $category->delete();

        return response()->noContent();
    }
}
