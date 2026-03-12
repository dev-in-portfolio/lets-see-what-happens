package com.example.codex.core.ui.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Card
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.example.codex.core.model.CodexNodeSummary

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CodexScreenScaffold(
    title: String,
    modifier: Modifier = Modifier,
    actions: @Composable () -> Unit = {},
    content: @Composable (PaddingValues) -> Unit,
) {
    Scaffold(
        modifier = modifier,
        topBar = {
            TopAppBar(
                title = { Text(title) },
                actions = { actions() },
            )
        },
        content = content,
    )
}

@Composable
fun CodexNodeList(
    nodes: List<CodexNodeSummary>,
    onNodeSelected: (CodexNodeSummary) -> Unit,
    modifier: Modifier = Modifier,
) {
    LazyColumn(
        modifier = modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        items(nodes, key = { it.codexId }) { node ->
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onNodeSelected(node) },
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(text = node.displayName, style = MaterialTheme.typography.titleMedium)
                    Text(text = node.codexId, style = MaterialTheme.typography.bodySmall)
                    node.notes?.let {
                        Text(
                            text = it,
                            style = MaterialTheme.typography.bodySmall,
                            modifier = Modifier.padding(top = 4.dp),
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun DetailListItem(
    headline: String,
    supporting: String,
    modifier: Modifier = Modifier,
    onClick: (() -> Unit)? = null,
) {
    ListItem(
        headlineContent = { Text(headline) },
        supportingContent = { Text(supporting) },
        modifier = modifier.then(
            if (onClick != null) Modifier.clickable { onClick() } else Modifier,
        ),
    )
}
