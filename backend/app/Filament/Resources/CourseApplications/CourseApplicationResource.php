<?php

namespace App\Filament\Resources\CourseApplications;

use App\Filament\Resources\CourseApplications\Pages\CreateCourseApplication;
use App\Filament\Resources\CourseApplications\Pages\EditCourseApplication;
use App\Filament\Resources\CourseApplications\Pages\ListCourseApplications;
use App\Filament\Resources\CourseApplications\Schemas\CourseApplicationForm;
use App\Filament\Resources\CourseApplications\Tables\CourseApplicationsTable;
use App\Models\CourseApplication;
use BackedEnum;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletingScope;

class CourseApplicationResource extends Resource
{
    protected static ?string $model = CourseApplication::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedClipboardDocumentList;

    public static function form(Schema $schema): Schema
    {
        return CourseApplicationForm::configure($schema);
    }

    public static function table(Table $table): Table
    {
        return CourseApplicationsTable::configure($table);
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
            'index' => ListCourseApplications::route('/'),
            'create' => CreateCourseApplication::route('/create'),
            'edit' => EditCourseApplication::route('/{record}/edit'),
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
