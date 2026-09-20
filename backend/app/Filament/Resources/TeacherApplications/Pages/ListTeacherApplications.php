<?php

namespace App\Filament\Resources\TeacherApplications\Pages;

use App\Filament\Resources\TeacherApplications\TeacherApplicationResource;
use Filament\Actions\CreateAction;
use Filament\Resources\Pages\ListRecords;

class ListTeacherApplications extends ListRecords
{
    protected static string $resource = TeacherApplicationResource::class;

    protected function getHeaderActions(): array
    {
        return [
            CreateAction::make(),
        ];
    }
}
