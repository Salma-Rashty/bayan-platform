<?php

namespace App\Filament\Resources\Courses\Schemas;

use Filament\Forms\Components\DatePicker;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Schemas\Components\Utilities\Set;
use Filament\Schemas\Schema;
use Illuminate\Support\Str;

class CourseForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                TextInput::make('title')
                    ->required()
                    ->live(onBlur: true)
                    ->afterStateUpdated(fn (string $operation, ?string $state, Set $set) => $operation === 'create'
                        ? $set('slug', Str::slug($state))
                        : null),
                TextInput::make('slug')
                    ->required()
                    ->unique(ignoreRecord: true),
                Textarea::make('description')
                    ->columnSpanFull(),
                Select::make('type')
                    ->options(['arabic' => 'Arabic', 'quran' => 'Quran'])
                    ->required(),
                TextInput::make('level'),
                TextInput::make('price')
                    ->required()
                    ->numeric()
                    ->default(0.0)
                    ->prefix('$'),
                DatePicker::make('starts_at'),
                DatePicker::make('registration_opens_at'),
                DatePicker::make('registration_closes_at'),
                Toggle::make('is_published')
                    ->required(),
                Select::make('teachers')
                    ->relationship('teachers', 'name', fn ($query) => $query->role('teacher'))
                    ->multiple()
                    ->preload()
                    ->searchable(),
            ]);
    }
}
