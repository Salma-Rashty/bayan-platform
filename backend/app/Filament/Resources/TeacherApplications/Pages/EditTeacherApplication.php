<?php

namespace App\Filament\Resources\TeacherApplications\Pages;

use App\Filament\Resources\TeacherApplications\TeacherApplicationResource;
use Filament\Actions\DeleteAction;
use Filament\Actions\ForceDeleteAction;
use Filament\Actions\RestoreAction;
use Filament\Resources\Pages\EditRecord;

class EditTeacherApplication extends EditRecord
{
    protected static string $resource = TeacherApplicationResource::class;

    protected function getHeaderActions(): array
    {
        return [
            DeleteAction::make(),
            ForceDeleteAction::make(),
            RestoreAction::make(),
        ];
    }
}
