<?php

namespace App\Filament\Resources\TeacherApplications;

use App\Filament\Resources\TeacherApplications\Pages\CreateTeacherApplication;
use App\Filament\Resources\TeacherApplications\Pages\EditTeacherApplication;
use App\Filament\Resources\TeacherApplications\Pages\ListTeacherApplications;
use App\Filament\Resources\TeacherApplications\Schemas\TeacherApplicationForm;
use App\Filament\Resources\TeacherApplications\Tables\TeacherApplicationsTable;
use App\Models\TeacherApplication;
use BackedEnum;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletingScope;

class TeacherApplicationResource extends Resource
{
    protected static ?string $model = TeacherApplication::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedUserPlus;

    public static function form(Schema $schema): Schema
    {
        return TeacherApplicationForm::configure($schema);
    }

    public static function table(Table $table): Table
    {
        return TeacherApplicationsTable::configure($table);
    }

    public static function getRelations(): array
    {
        return [
            //
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => ListTeacherApplications::route('/'),
            'create' => CreateTeacherApplication::route('/create'),
            'edit' => EditTeacherApplication::route('/{record}/edit'),
        ];
    }

    public static function getRecordRouteBindingEloquentQuery(): Builder
    {
        return parent::getRecordRouteBindingEloquentQuery()
            ->withoutGlobalScopes([
                SoftDeletingScope::class,
            ]);
    }
}
