<?php

namespace App\Http\Controllers\Api\V1\Category;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCategoryRequest;
use App\Http\Requests\UpdateCategoryRequest;
use App\Models\Category;

class CategoryController extends Controller
{
    public function index()
    {
        return Category::with('media')->get();
    }

    public function store(StoreCategoryRequest $request)
    {
        $category = Category::create($request->validated());

        return response()->json($category->load('media'), 201);
    }

    public function show(Category $category)
    {
        return $category->load('media');
    }

    public function update(UpdateCategoryRequest $request, Category $category)
    {
        $category->update($request->validated());

        return response()->json($category->load('media'));
    }

    public function destroy(Category $category)
    {
        $category->delete();

        return response()->noContent();
    }
}
