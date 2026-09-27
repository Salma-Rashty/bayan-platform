<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\UserNotes\StoreUserNoteRequest;
use App\Http\Resources\UserNoteResource;
use App\Models\User;
use App\Models\UserNote;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

class UserNoteController extends Controller
{
    public function store(StoreUserNoteRequest $request, User $user): JsonResponse
    {
        $note = $user->notes()->create([
            'author_id' => $request->user()->id,
            'body' => $request->validated('body'),
        ]);

        return (new UserNoteResource($note->load('author')))->response()->setStatusCode(201);
    }

    public function destroy(UserNote $note): JsonResponse
    {
        Gate::authorize('delete', $note);

        $note->delete();

        return response()->json(['message' => 'Note deleted.']);
    }
}
