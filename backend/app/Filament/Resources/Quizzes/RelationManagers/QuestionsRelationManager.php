<?php

namespace App\Filament\Resources\Quizzes\RelationManagers;

use Filament\Actions\BulkActionGroup;
use Filament\Actions\CreateAction;
use Filament\Actions\DeleteAction;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\EditAction;
use Filament\Actions\RestoreAction;
use Filament\Actions\RestoreBulkAction;
use Filament\Forms\Components\Repeater;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Schemas\Schema;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\TrashedFilter;
use Filament\Tables\Table;

class QuestionsRelationManager extends RelationManager
{
    protected static string $relationship = 'questions';

    public function form(Schema $schema): Schema
    {
        return $schema
            ->components([
                Textarea::make('body')
                    ->required()
                    ->columnSpanFull(),
                Select::make('type')
                    ->options([
                        'single' => 'Single choice',
                        'multiple' => 'Multiple choice',
                    ])
                    ->default('single')
                    ->required(),
                TextInput::make('order')
                    ->required()
                    ->numeric()
                    ->default(0),
                Repeater::make('options')
                    ->relationship()
                    ->schema([
                        TextInput::make('body')
                            ->required()
                            ->columnSpan(2),
                        Toggle::make('is_correct')
                            ->inline(false),
                    ])
                    ->columns(3)
                    ->addActionLabel('Add option')
                    ->defaultItems(0)
                    ->columnSpanFull(),
            ]);
    }

    public function table(Table $table): Table
    {
        return $table
            ->recordTitleAttribute('body')
            ->columns([
                TextColumn::make('body')
                    ->limit(60)
                    ->searchable(),
                TextColumn::make('type')
                    ->badge(),
                TextColumn::make('order')
                    ->numeric(),
                TextColumn::make('options_count')
                    ->label('Options')
                    ->counts('options')
                    ->numeric(),
            ])
            ->defaultSort('order')
            ->reorderable('order')
            ->filters([
                TrashedFilter::make(),
            ])
            ->headerActions([
                CreateAction::make(),
            ])
            ->recordActions([
                EditAction::make(),
                DeleteAction::make(),
                RestoreAction::make(),
            ])
            ->toolbarActions([
                BulkActionGroup::make([
                    DeleteBulkAction::make(),
                    RestoreBulkAction::make(),
                ]),
            ]);
    }
}
