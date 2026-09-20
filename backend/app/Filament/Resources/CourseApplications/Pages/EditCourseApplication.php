<?php

namespace App\Filament\Resources\CourseApplications\Pages;

use App\Filament\Resources\CourseApplications\CourseApplicationResource;
use Filament\Actions\DeleteAction;
use Filament\Actions\ForceDeleteAction;
use Filament\Actions\RestoreAction;
use Filament\Resources\Pages\EditRecord;

class EditCourseApplication extends EditRecord
{
    protected static string $resource = CourseApplicationResource::class;

    protected function getHeaderActions(): array
    {
        return [
            DeleteAction::make(),
            ForceDeleteAction::make(),
            RestoreAction::make(),
        ];
    }
}
