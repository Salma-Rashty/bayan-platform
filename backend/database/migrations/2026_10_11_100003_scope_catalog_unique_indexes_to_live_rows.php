<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Catalog uniqueness that ignores soft-deleted rows. MySQL has no partial indexes, so each
 * table gets a generated `alive` column (1 while live, NULL once soft-deleted) and every
 * unique index includes it: unique indexes never treat NULLs as equal, so trashed rows
 * drop out of them and their name/order can be reused.
 *
 *   categories: name, order                  (global)
 *   levels:     name, order within category_id
 */
return new class extends Migration
{
    private const ALIVE = 'case when deleted_at is null then 1 end';

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        foreach (['categories', 'levels'] as $table) {
            Schema::table($table, function (Blueprint $table) {
                $table->tinyInteger('alive')->nullable()->virtualAs(self::ALIVE);
            });
        }

        Schema::table('categories', function (Blueprint $table) {
            $table->unique(['name', 'alive'], 'categories_name_alive_unique');
            $table->unique(['order', 'alive'], 'categories_order_alive_unique');
        });
        Schema::table('categories', function (Blueprint $table) {
            $table->dropUnique('categories_name_unique');
        });

        // Added before the old index is dropped: MySQL uses an index starting with
        // category_id for the foreign key and refuses to drop the last one.
        Schema::table('levels', function (Blueprint $table) {
            $table->unique(['category_id', 'name', 'alive'], 'levels_category_id_name_alive_unique');
            $table->unique(['category_id', 'order', 'alive'], 'levels_category_id_order_alive_unique');
        });
        Schema::table('levels', function (Blueprint $table) {
            $table->dropUnique('levels_category_id_name_unique');
        });
    }

    /**
     * Reverse the migrations. Fails if a live and a soft-deleted row now share a name,
     * since the original indexes counted soft-deleted rows too.
     */
    public function down(): void
    {
        Schema::table('levels', function (Blueprint $table) {
            $table->unique(['category_id', 'name'], 'levels_category_id_name_unique');
        });
        Schema::table('levels', function (Blueprint $table) {
            $table->dropUnique('levels_category_id_order_alive_unique');
            $table->dropUnique('levels_category_id_name_alive_unique');
        });

        Schema::table('categories', function (Blueprint $table) {
            $table->unique('name', 'categories_name_unique');
        });
        Schema::table('categories', function (Blueprint $table) {
            $table->dropUnique('categories_order_alive_unique');
            $table->dropUnique('categories_name_alive_unique');
        });

        foreach (['categories', 'levels'] as $table) {
            Schema::table($table, function (Blueprint $table) {
                $table->dropColumn('alive');
            });
        }
    }
};
